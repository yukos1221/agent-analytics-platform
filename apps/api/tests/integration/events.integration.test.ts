/**
 * Integration Tests: Events API
 *
 * Testing Spec Reference: docs/06-testing-specification.md Section 3.3
 *
 * These tests verify the full request/response cycle through the Hono app,
 * including:
 * - HTTP layer (headers, status codes, content negotiation)
 * - Routing (/v1/events prefix)
 * - Middleware (auth, validation)
 * - Handler logic
 * - Response serialization
 *
 * MVP Integration Test Requirements (per docs/06-testing-specification.md §1.5):
 * ✓ Event ingestion → storage
 * ✓ Multi-tenant data isolation (CRITICAL)
 * ✓ Authentication flow (API key)
 * ✓ Rate limiting headers
 *
 * Note: These tests use Hono's built-in test interface to make HTTP-like
 * requests without starting a real server. For MVP, we use in-memory storage.
 * Full database integration tests will be added in Phase 2.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../../src/app';
import { eventStore } from '../../src/services';
import {
	API_KEYS,
	createEvent,
	createEventBatch,
	createSessionEvents,
	OPENAPI_EXAMPLES,
	generateEventId,
} from '../fixtures/events';
import type { EventBatchResponse, ErrorResponse } from '../../src/schemas';

/**
 * Integration test helper - makes requests to the full app with /v1 prefix
 */
async function apiRequest(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return app.request(path, options);
}

/**
 * POST helper for /v1/events
 */
async function postEvents(
	body: unknown,
	apiKey: string = API_KEYS.ORG_A
): Promise<Response> {
	return apiRequest('/v1/events', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': apiKey,
		},
		body: JSON.stringify(body),
	});
}

describe('Events API Integration', () => {
	beforeEach(() => {
		eventStore.clear();
	});

	afterAll(() => {
		eventStore.clear();
	});

	// ===========================================================================
	// HTTP Layer Tests
	// Verify the full HTTP request/response cycle with /v1 prefix
	// ===========================================================================
	describe('HTTP Layer', () => {
		it('responds to POST /v1/events with 202 for valid request', async () => {
			const response = await postEvents(createEventBatch(1));

			expect(response.status).toBe(202);

			const body: EventBatchResponse = await response.json();
			expect(body.accepted).toBe(1);
		});

		it('returns correct content-type header', async () => {
			const response = await postEvents(createEventBatch(1));

			expect(response.headers.get('Content-Type')).toContain(
				'application/json'
			);
		});

		it('returns rate limit headers', async () => {
			const response = await postEvents(createEventBatch(1));

			expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
			expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
			expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
		});

		it('routes correctly with /v1 prefix', async () => {
			// Without /v1 prefix should not match
			const wrongPath = await app.request('/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify(createEventBatch(1)),
			});
			expect(wrongPath.status).toBe(404);

			// With /v1 prefix should work
			const correctPath = await postEvents(createEventBatch(1));
			expect(correctPath.status).toBe(202);
		});
	});

	// ===========================================================================
	// Event Ingestion Flow
	// Per MVP spec: "Event ingestion → storage"
	// ===========================================================================
	describe('Event Ingestion Flow', () => {
		it('ingests single event and stores it', async () => {
			const event = createEvent();

			const response = await postEvents({ events: [event] });

			expect(response.status).toBe(202);
			const body: EventBatchResponse = await response.json();
			expect(body.accepted).toBe(1);
			expect(body.rejected).toBe(0);

			// Verify event is stored
			const stored = eventStore.getByOrg('org_testorg123');
			expect(stored.length).toBe(1);
			expect(stored[0].event_id).toBe(event.event_id);
		});

		it('ingests batch of events', async () => {
			const events = [createEvent(), createEvent(), createEvent()];

			const response = await postEvents({ events });

			expect(response.status).toBe(202);
			const body: EventBatchResponse = await response.json();
			expect(body.accepted).toBe(3);

			const stored = eventStore.getByOrg('org_testorg123');
			expect(stored.length).toBe(3);
		});

		it('ingests session lifecycle events', async () => {
			const sessionEvents = createSessionEvents();

			const response = await postEvents({ events: sessionEvents });

			expect(response.status).toBe(202);
			const body: EventBatchResponse = await response.json();
			expect(body.accepted).toBe(3);

			// Verify all event types stored
			const stored = eventStore.getByOrg('org_testorg123');
			const types = stored.map((e) => e.event_type);
			expect(types).toContain('session_start');
			expect(types).toContain('task_complete');
			expect(types).toContain('session_end');
		});

		it('ingests OpenAPI spec example events', async () => {
			const response = await postEvents({
				events: [OPENAPI_EXAMPLES.sessionStart, OPENAPI_EXAMPLES.taskComplete],
			});

			expect(response.status).toBe(202);
			const body: EventBatchResponse = await response.json();
			expect(body.accepted).toBe(2);
		});

		it('handles duplicate event IDs gracefully', async () => {
			const event = createEvent();

			// First ingestion
			const first = await postEvents({ events: [event] });
			const firstBody: EventBatchResponse = await first.json();
			expect(firstBody.accepted).toBe(1);

			// Second ingestion with same ID
			const second = await postEvents({ events: [event] });
			const secondBody: EventBatchResponse = await second.json();
			expect(secondBody.accepted).toBe(0);
			expect(secondBody.rejected).toBe(1);
			expect(secondBody.errors?.[0].code).toBe('EVT_DUPLICATE');
		});

		it('adds org context to stored events', async () => {
			const event = createEvent();

			await postEvents({ events: [event] });

			const stored = eventStore.getByOrg('org_testorg123');
			expect(stored[0].org_id).toBe('org_testorg123');
			expect(stored[0].ingested_at).toBeDefined();
		});

		it('handles large batch (1000 events)', async () => {
			const batch = createEventBatch(1000);

			const response = await postEvents(batch);
			const body: EventBatchResponse = await response.json();

			expect(response.status).toBe(202);
			expect(body.accepted).toBe(1000);
		});
	});

	// ===========================================================================
	// Authentication Flow
	// Per MVP spec: "Authentication flow (API key)"
	// ===========================================================================
	describe('Authentication Flow', () => {
		it('requires X-API-Key header', async () => {
			const response = await apiRequest('/v1/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(createEventBatch(1)),
			});

			expect(response.status).toBe(401);

			const body: ErrorResponse = await response.json();
			expect(body.error.code).toBe('AUTH_MISSING_KEY');
		});

		it('rejects invalid API key format', async () => {
			const response = await postEvents(createEventBatch(1), 'invalid-key');

			expect(response.status).toBe(401);
			const body: ErrorResponse = await response.json();
			expect(body.error.code).toBe('AUTH_INVALID_KEY');
		});

		it('accepts production API key', async () => {
			const response = await postEvents(createEventBatch(1), API_KEYS.ORG_A);
			expect(response.status).toBe(202);
		});

		it('accepts staging API key', async () => {
			const response = await postEvents(createEventBatch(1), API_KEYS.STAGING);
			expect(response.status).toBe(202);
		});

		it('accepts dev API key', async () => {
			const response = await postEvents(createEventBatch(1), API_KEYS.DEV);
			expect(response.status).toBe(202);
		});

		it('extracts org_id from API key', async () => {
			const event = createEvent();

			await postEvents({ events: [event] }, API_KEYS.ORG_A);

			// Verify event stored under correct org
			expect(eventStore.countByOrg('org_testorg123')).toBe(1);
			expect(eventStore.countByOrg('org_otherorg456')).toBe(0);
		});
	});

	// ===========================================================================
	// Multi-Tenant Isolation (CRITICAL)
	// Per MVP spec: "Multi-tenant data isolation (CRITICAL)"
	// ===========================================================================
	describe('Multi-Tenant Isolation (CRITICAL)', () => {
		it('isolates events between organizations', async () => {
			// Org A ingests events
			const eventA = createEvent();
			await postEvents({ events: [eventA] }, API_KEYS.ORG_A);

			// Org B ingests events
			const eventB = createEvent();
			await postEvents({ events: [eventB] }, API_KEYS.ORG_B);

			// Verify isolation
			const orgAEvents = eventStore.getByOrg('org_testorg123');
			const orgBEvents = eventStore.getByOrg('org_otherorg456');

			expect(orgAEvents.length).toBe(1);
			expect(orgBEvents.length).toBe(1);

			expect(orgAEvents[0].event_id).toBe(eventA.event_id);
			expect(orgBEvents[0].event_id).toBe(eventB.event_id);
		});

		it('same event_id allowed in different orgs', async () => {
			const sharedId = generateEventId();

			// Both orgs submit same event_id
			const responseA = await postEvents(
				{ events: [createEvent({ event_id: sharedId })] },
				API_KEYS.ORG_A
			);
			const bodyA: EventBatchResponse = await responseA.json();

			const responseB = await postEvents(
				{ events: [createEvent({ event_id: sharedId })] },
				API_KEYS.ORG_B
			);
			const bodyB: EventBatchResponse = await responseB.json();

			// Both should succeed
			expect(bodyA.accepted).toBe(1);
			expect(bodyB.accepted).toBe(1);

			// Total 2 events across orgs
			expect(eventStore.size).toBe(2);
		});

		it('duplicate detection is per-org', async () => {
			const event = createEvent();

			// Org A: first submission
			const a1 = await postEvents({ events: [event] }, API_KEYS.ORG_A);
			const a1Body: EventBatchResponse = await a1.json();
			expect(a1Body.accepted).toBe(1);

			// Org A: duplicate
			const a2 = await postEvents({ events: [event] }, API_KEYS.ORG_A);
			const a2Body: EventBatchResponse = await a2.json();
			expect(a2Body.rejected).toBe(1);

			// Org B: same event_id should work
			const b1 = await postEvents({ events: [event] }, API_KEYS.ORG_B);
			const b1Body: EventBatchResponse = await b1.json();
			expect(b1Body.accepted).toBe(1);
		});

		it('org cannot access another org events', async () => {
			// Org A ingests 5 events
			await postEvents(createEventBatch(5), API_KEYS.ORG_A);

			// Only Org A should have events
			expect(eventStore.countByOrg('org_testorg123')).toBe(5);
			expect(eventStore.countByOrg('org_otherorg456')).toBe(0);
		});

		it('org_id is derived from API key only', async () => {
			const event = createEvent();

			await postEvents({ events: [event] }, API_KEYS.ORG_A);

			// Verify event is stored under the org from API key
			const storedEvents = eventStore.getByOrg('org_testorg123');
			expect(storedEvents.length).toBe(1);
			expect(storedEvents[0].org_id).toBe('org_testorg123');
		});
	});

	// ===========================================================================
	// Validation Tests
	// Test schema validation through HTTP layer
	// ===========================================================================
	describe('Request Validation', () => {
		it('rejects empty events array with 422', async () => {
			const response = await postEvents({ events: [] });

			expect(response.status).toBe(422);
			const body: ErrorResponse = await response.json();
			expect(body.error.code).toBe('VAL_INVALID_FORMAT');
		});

		it('rejects invalid event schema with 422', async () => {
			const response = await postEvents({ events: [{ invalid: 'data' }] });

			expect(response.status).toBe(422);
			const body: ErrorResponse = await response.json();
			expect(body.error.code).toBe('VAL_INVALID_FORMAT');
			expect(body.error.details).toBeDefined();
		});

		it('includes field-level errors in validation response', async () => {
			const response = await postEvents({
				events: [createEvent({ event_id: 'bad-id' })],
			});

			expect(response.status).toBe(422);
			const body: ErrorResponse = await response.json();
			expect(body.error.details.errors).toBeInstanceOf(Array);
			expect(body.error.details.errors[0]).toHaveProperty('field');
			expect(body.error.details.errors[0]).toHaveProperty('message');
		});

		it('rejects batch exceeding 1000 events', async () => {
			const batch = createEventBatch(1001);

			const response = await postEvents(batch);

			expect(response.status).toBe(422);
		});
	});

	// ===========================================================================
	// Response Format Tests
	// ===========================================================================
	describe('Response Format', () => {
		it('returns request_id for debugging', async () => {
			const response = await postEvents(createEventBatch(1));
			const body: EventBatchResponse = await response.json();

			expect(body.request_id).toBeDefined();
			expect(body.request_id.startsWith('req_')).toBe(true);
		});

		it('generates unique request_id per request', async () => {
			const r1 = await postEvents(createEventBatch(1));
			const r1Body: EventBatchResponse = await r1.json();

			const r2 = await postEvents(createEventBatch(1));
			const r2Body: EventBatchResponse = await r2.json();

			expect(r1Body.request_id).not.toBe(r2Body.request_id);
		});

		it('error responses include request_id', async () => {
			const response = await postEvents({ events: [] });
			const body: ErrorResponse = await response.json();

			expect(body.request_id).toBeDefined();
		});

		it('rate limit values are numeric', async () => {
			const response = await postEvents(createEventBatch(1));

			const limit = Number(response.headers.get('X-RateLimit-Limit'));
			const remaining = Number(response.headers.get('X-RateLimit-Remaining'));
			const reset = Number(response.headers.get('X-RateLimit-Reset'));

			expect(limit).toBeGreaterThan(0);
			expect(remaining).toBeGreaterThanOrEqual(0);
			expect(reset).toBeGreaterThan(0);
		});
	});

	// ===========================================================================
	// Health Check (verifies app is configured correctly)
	// ===========================================================================
	describe('App Health', () => {
		it('health endpoint is accessible', async () => {
			const response = await apiRequest('/health');
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.status).toBe('healthy');
		});

		it('root endpoint returns API info', async () => {
			const response = await apiRequest('/');
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.name).toBe('AI Agent Analytics API');
		});
	});
});
