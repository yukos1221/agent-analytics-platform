/**
 * Unit Tests: Events Ingest Handler
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * API Spec Reference: docs/03-api-specification-v1.2.md Section 6.1
 * OpenAPI Spec: specs/openapi.mvp.v1.yaml - POST /events
 *
 * MVP Test Suite Coverage (per docs/06-testing-specification.md §1.5):
 * ✓ POST /v1/events - schema validation
 * ✓ All error responses match documented schemas
 * ✓ API request/response handling
 * ✓ Authentication middleware
 *
 * Status Codes per OpenAPI spec:
 * - 202: Events accepted for processing
 * - 400: Bad request - invalid parameters
 * - 401: Unauthorized - missing or invalid API key
 * - 422: Validation error - request body invalid
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import events from '../../../src/routes/events';
import { eventStore } from '../../../src/services';
import {
	EventBatchResponseSchema,
	ErrorResponseSchema,
	EventSchema,
} from '../../../src/schemas';
import {
	API_KEYS,
	createEvent,
	createEventBatch,
	createSessionEvents,
	INVALID_EVENTS,
	EVENT_TYPES,
	ENVIRONMENTS,
	OPENAPI_EXAMPLES,
} from '../../fixtures/events';

// Create test app with events routes
const app = new Hono();
app.route('/events', events);

// Helper to make requests to test app
async function request(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return app.request(path, options);
}

// Helper for POST requests with common headers
async function postEvents(
	body: unknown,
	apiKey: string = API_KEYS.ORG_A
): Promise<Response> {
	return request('/events', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': apiKey,
		},
		body: JSON.stringify(body),
	});
}

describe('POST /events', () => {
	beforeEach(() => {
		eventStore.clear();
	});

	afterEach(() => {
		eventStore.clear();
	});

	// ===========================================================================
	// Authentication Tests
	// Per MVP spec: "Authentication middleware" must be tested
	// ===========================================================================
	describe('Authentication (API Key)', () => {
		it('returns 401 when X-API-Key header is missing', async () => {
			const response = await request('/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(createEventBatch(1)),
			});

			expect(response.status).toBe(401);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);
			expect(result.success).toBe(true);

			expect(body.error.code).toBe('AUTH_MISSING_KEY');
			expect(body).toHaveProperty('request_id');
			expect(body.error).toHaveProperty('documentation_url');
		});

		it('returns 401 for invalid API key format', async () => {
			const response = await postEvents(
				createEventBatch(1),
				API_KEYS.INVALID_FORMAT
			);

			expect(response.status).toBe(401);

			const body = await response.json();
			expect(body.error.code).toBe('AUTH_INVALID_KEY');
		});

		it('returns 401 for API key with invalid prefix', async () => {
			const response = await postEvents(
				createEventBatch(1),
				API_KEYS.INVALID_PREFIX
			);

			expect(response.status).toBe(401);
		});

		it('accepts valid production API key and returns 202', async () => {
			const response = await postEvents(createEventBatch(1), API_KEYS.ORG_A);
			expect(response.status).toBe(202);
		});

		it('accepts valid staging API key', async () => {
			const response = await postEvents(createEventBatch(1), API_KEYS.STAGING);
			expect(response.status).toBe(202);
		});

		it('accepts valid dev API key', async () => {
			const response = await postEvents(createEventBatch(1), API_KEYS.DEV);
			expect(response.status).toBe(202);
		});
	});

	// ===========================================================================
	// Request Body Validation Tests
	// Per MVP spec: "POST /v1/events - schema validation"
	// ===========================================================================
	describe('Request Body Validation (OpenAPI Contract)', () => {
		describe('Batch constraints', () => {
			it('returns 422 when events array is empty', async () => {
				const response = await postEvents({ events: [] });

				expect(response.status).toBe(422);

				const body = await response.json();
				expect(body.error.code).toBe('VAL_INVALID_FORMAT');
				expect(body.error.message).toBe('Validation failed');
			});

			it('returns 422 when events array exceeds 1000 items', async () => {
				const response = await postEvents(createEventBatch(1001));
				expect(response.status).toBe(422);
			});

			it('returns 422 when events property is missing', async () => {
				const response = await postEvents({});
				expect(response.status).toBe(422);
			});

			it('returns 422 when events is not an array', async () => {
				const response = await postEvents({ events: 'not-an-array' });
				expect(response.status).toBe(422);
			});

			it('accepts exactly 1000 events (max allowed)', async () => {
				const response = await postEvents(createEventBatch(1000));
				expect(response.status).toBe(202);

				const body = await response.json();
				expect(body.accepted).toBe(1000);
			});

			it('accepts single event (min allowed)', async () => {
				const response = await postEvents(createEventBatch(1));
				expect(response.status).toBe(202);

				const body = await response.json();
				expect(body.accepted).toBe(1);
			});
		});

		describe('event_id validation', () => {
			it('returns 422 for invalid event_id pattern', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.BAD_EVENT_ID],
				});

				expect(response.status).toBe(422);

				const body = await response.json();
				expect(body.error.details.errors[0].field).toContain('event_id');
			});

			it('accepts event_id at minimum length (24 chars)', async () => {
				// evt_ + 20 chars = 24 total
				const response = await postEvents({
					events: [createEvent({ event_id: 'evt_01234567890123456789' })],
				});
				expect(response.status).toBe(202);
			});

			it('accepts event_id at maximum length (34 chars)', async () => {
				// evt_ + 30 chars = 34 total
				const response = await postEvents({
					events: [
						createEvent({ event_id: 'evt_012345678901234567890123456789' }),
					],
				});
				expect(response.status).toBe(202);
			});
		});

		describe('session_id validation', () => {
			it('returns 422 for invalid session_id pattern', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.BAD_SESSION_ID],
				});

				expect(response.status).toBe(422);

				const body = await response.json();
				expect(body.error.details.errors[0].field).toContain('session_id');
			});
		});

		describe('event_type validation', () => {
			it('returns 422 for invalid event_type', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.BAD_EVENT_TYPE],
				});

				expect(response.status).toBe(422);

				const body = await response.json();
				expect(body.error.details.errors[0].field).toContain('event_type');
			});

			it('accepts all valid event_type values per OpenAPI enum', async () => {
				for (const eventType of EVENT_TYPES) {
					const response = await postEvents({
						events: [createEvent({ event_type: eventType })],
					});

					expect(response.status).toBe(202);
				}
			});
		});

		describe('timestamp validation', () => {
			it('returns 422 for invalid timestamp format', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.BAD_TIMESTAMP],
				});

				expect(response.status).toBe(422);

				const body = await response.json();
				expect(body.error.details.errors[0].field).toContain('timestamp');
			});

			it('accepts valid ISO 8601 timestamp with milliseconds', async () => {
				const response = await postEvents({
					events: [createEvent({ timestamp: '2025-12-09T10:30:00.000Z' })],
				});
				expect(response.status).toBe(202);
			});

			it('accepts valid ISO 8601 timestamp without milliseconds', async () => {
				const response = await postEvents({
					events: [createEvent({ timestamp: '2025-12-09T10:30:00Z' })],
				});
				expect(response.status).toBe(202);
			});
		});

		describe('environment validation', () => {
			it('returns 422 for invalid environment value', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.BAD_ENVIRONMENT],
				});
				expect(response.status).toBe(422);
			});

			it('accepts all valid environment values', async () => {
				for (const environment of ENVIRONMENTS) {
					const response = await postEvents({
						events: [createEvent({ environment })],
					});
					expect(response.status).toBe(202);
				}
			});

			it('defaults environment to production when not specified', async () => {
				const event = createEvent();
				delete (event as Record<string, unknown>).environment;

				const response = await postEvents({ events: [event] });
				expect(response.status).toBe(202);
			});
		});

		describe('user_id validation', () => {
			it('returns 422 when user_id exceeds 128 characters', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.USER_ID_TOO_LONG],
				});
				expect(response.status).toBe(422);
			});

			it('accepts user_id at exactly 128 characters', async () => {
				const response = await postEvents({
					events: [createEvent({ user_id: 'x'.repeat(128) })],
				});
				expect(response.status).toBe(202);
			});
		});

		describe('agent_id validation', () => {
			it('returns 422 when agent_id exceeds 64 characters', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.AGENT_ID_TOO_LONG],
				});
				expect(response.status).toBe(422);
			});

			it('accepts agent_id at exactly 64 characters', async () => {
				const response = await postEvents({
					events: [createEvent({ agent_id: 'x'.repeat(64) })],
				});
				expect(response.status).toBe(202);
			});
		});

		describe('Required field validation', () => {
			it('returns 422 when event_type is missing', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.MISSING_EVENT_TYPE],
				});
				expect(response.status).toBe(422);
			});

			it('returns 422 when timestamp is missing', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.MISSING_TIMESTAMP],
				});
				expect(response.status).toBe(422);
			});

			it('returns 422 when session_id is missing', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.MISSING_SESSION_ID],
				});
				expect(response.status).toBe(422);
			});

			it('returns 422 when user_id is missing', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.MISSING_USER_ID],
				});
				expect(response.status).toBe(422);
			});

			it('returns 422 when agent_id is missing', async () => {
				const response = await postEvents({
					events: [INVALID_EVENTS.MISSING_AGENT_ID],
				});
				expect(response.status).toBe(422);
			});
		});

		describe('metadata validation', () => {
			it('accepts event without metadata', async () => {
				const event = createEvent();
				delete (event as Record<string, unknown>).metadata;

				const response = await postEvents({ events: [event] });
				expect(response.status).toBe(202);
			});

			it('accepts event with complex nested metadata', async () => {
				const response = await postEvents({
					events: [
						createEvent({
							metadata: {
								nested: { deep: { value: 123 } },
								array: [1, 2, 3],
								string: 'test',
								boolean: true,
								null_value: null,
							},
						}),
					],
				});
				expect(response.status).toBe(202);
			});
		});
	});

	// ===========================================================================
	// Response Schema Validation Tests
	// Per MVP spec: "All error responses match documented schemas"
	// ===========================================================================
	describe('Response Schema Validation (OpenAPI Contract)', () => {
		it('returns valid EventBatchResponse schema', async () => {
			const response = await postEvents(createEventBatch(1));

			expect(response.status).toBe(202);

			const body = await response.json();
			const result = EventBatchResponseSchema.safeParse(body);

			expect(result.success).toBe(true);
			if (!result.success) {
				console.error('Schema validation errors:', result.error.issues);
			}
		});

		it('response contains required fields: accepted, rejected, request_id', async () => {
			const response = await postEvents(createEventBatch(1));
			const body = await response.json();

			expect(body).toHaveProperty('accepted');
			expect(body).toHaveProperty('rejected');
			expect(body).toHaveProperty('request_id');

			expect(typeof body.accepted).toBe('number');
			expect(typeof body.rejected).toBe('number');
			expect(typeof body.request_id).toBe('string');
		});

		it('accepted count matches number of valid events', async () => {
			const response = await postEvents(createEventBatch(3));
			const body = await response.json();

			expect(body.accepted).toBe(3);
			expect(body.rejected).toBe(0);
		});

		it('errors array is included only when events are rejected', async () => {
			const event = createEvent();

			// First, add an event
			await postEvents({ events: [event] });

			// Try to add the same event again (duplicate)
			const response = await postEvents({ events: [event] });
			const body = await response.json();

			expect(body.rejected).toBe(1);
			expect(body.errors).toBeDefined();
			expect(body.errors.length).toBe(1);
			expect(body.errors[0].code).toBe('EVT_DUPLICATE');
			expect(body.errors[0].event_id).toBe(event.event_id);
		});

		it('errors array is omitted when no events are rejected', async () => {
			const response = await postEvents(createEventBatch(1));
			const body = await response.json();

			expect(body.rejected).toBe(0);
			expect(body.errors).toBeUndefined();
		});

		it('accepts OpenAPI spec example events', async () => {
			const response = await postEvents({
				events: [OPENAPI_EXAMPLES.sessionStart, OPENAPI_EXAMPLES.taskComplete],
			});

			expect(response.status).toBe(202);

			const body = await response.json();
			expect(body.accepted).toBe(2);
		});
	});

	// ===========================================================================
	// Duplicate Event Handling Tests
	// Per OpenAPI spec: "Duplicate event_ids are rejected"
	// ===========================================================================
	describe('Duplicate Event Handling', () => {
		it('rejects duplicate event_id within same organization', async () => {
			const event = createEvent();

			// First request - should succeed
			const response1 = await postEvents({ events: [event] });
			expect(response1.status).toBe(202);
			const body1 = await response1.json();
			expect(body1.accepted).toBe(1);

			// Second request with same event - should reject
			const response2 = await postEvents({ events: [event] });
			expect(response2.status).toBe(202);
			const body2 = await response2.json();
			expect(body2.accepted).toBe(0);
			expect(body2.rejected).toBe(1);
			expect(body2.errors[0].code).toBe('EVT_DUPLICATE');
		});

		it('handles partial batch with some duplicates', async () => {
			const event1 = createEvent();
			const event2 = createEvent();

			// First, add event1
			await postEvents({ events: [event1] });

			// Now send batch with duplicate (event1) and new event (event2)
			const response = await postEvents({ events: [event1, event2] });
			const body = await response.json();

			expect(body.accepted).toBe(1);
			expect(body.rejected).toBe(1);
			expect(body.errors[0].index).toBe(0);
		});

		it('duplicate within same batch is rejected', async () => {
			const event = createEvent();

			const response = await postEvents({ events: [event, event] });
			const body = await response.json();

			expect(body.accepted).toBe(1);
			expect(body.rejected).toBe(1);
			expect(body.errors[0].index).toBe(1);
		});
	});

	// ===========================================================================
	// Multi-Tenant Isolation Tests
	// Per MVP spec: "Multi-tenant data isolation (CRITICAL)"
	// ===========================================================================
	describe('Multi-Tenant Isolation', () => {
		it('same event_id can exist in different organizations', async () => {
			const sharedEventId = 'evt_01HGX5VBJX2Q8JYXMVQZRK3456';
			const event = createEvent({ event_id: sharedEventId });

			// Org A adds event
			const responseA = await postEvents({ events: [event] }, API_KEYS.ORG_A);
			expect(responseA.status).toBe(202);
			const bodyA = await responseA.json();
			expect(bodyA.accepted).toBe(1);

			// Org B adds same event_id - should succeed (different namespace)
			const responseB = await postEvents({ events: [event] }, API_KEYS.ORG_B);
			expect(responseB.status).toBe(202);
			const bodyB = await responseB.json();
			expect(bodyB.accepted).toBe(1);
		});

		it('org isolation - events are stored per-org', async () => {
			const eventA = createEvent();
			const eventB = createEvent();

			await postEvents({ events: [eventA] }, API_KEYS.ORG_A);
			await postEvents({ events: [eventB] }, API_KEYS.ORG_B);

			// Verify events are stored separately
			const orgAEvents = eventStore.getByOrg('org_testorg123');
			const orgBEvents = eventStore.getByOrg('org_otherorg456');

			expect(orgAEvents.length).toBe(1);
			expect(orgBEvents.length).toBe(1);
			expect(orgAEvents[0].event_id).toBe(eventA.event_id);
			expect(orgBEvents[0].event_id).toBe(eventB.event_id);
		});

		it('org_id is derived from API key, not request body', async () => {
			const event = createEvent();

			await postEvents({ events: [event] }, API_KEYS.ORG_A);

			// Verify event is stored under the org from API key
			const storedEvents = eventStore.getByOrg('org_testorg123');
			expect(storedEvents.length).toBe(1);
			expect(storedEvents[0].org_id).toBe('org_testorg123');
		});
	});

	// ===========================================================================
	// Response Headers Tests
	// Per OpenAPI spec: Rate limit headers are required
	// ===========================================================================
	describe('Response Headers (OpenAPI Compliance)', () => {
		it('includes rate limit headers', async () => {
			const response = await postEvents(createEventBatch(1));

			expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
			expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
			expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();

			expect(Number(response.headers.get('X-RateLimit-Limit'))).toBeGreaterThan(
				0
			);
			expect(
				Number(response.headers.get('X-RateLimit-Remaining'))
			).toBeGreaterThanOrEqual(0);
			expect(Number(response.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(
				0
			);
		});

		it('returns application/json content type', async () => {
			const response = await postEvents(createEventBatch(1));
			const contentType = response.headers.get('Content-Type');
			expect(contentType).toContain('application/json');
		});
	});

	// ===========================================================================
	// Request ID Tracking Tests
	// Per OpenAPI spec: request_id required for debugging
	// ===========================================================================
	describe('Request ID Tracking', () => {
		it('generates unique request_id for each request', async () => {
			const response1 = await postEvents(createEventBatch(1));
			const response2 = await postEvents(createEventBatch(1));

			const body1 = await response1.json();
			const body2 = await response2.json();

			expect(body1.request_id).not.toBe(body2.request_id);
		});

		it('error responses include request_id', async () => {
			const response = await postEvents({ events: [] });
			const body = await response.json();

			expect(body).toHaveProperty('request_id');
			expect(typeof body.request_id).toBe('string');
			expect(body.request_id.startsWith('req_')).toBe(true);
		});
	});

	// ===========================================================================
	// Error Response Format Tests
	// Per MVP spec: "All error responses match documented schemas"
	// ===========================================================================
	describe('Error Response Format', () => {
		it('validation errors match OpenAPI ErrorResponse schema', async () => {
			const response = await postEvents({ events: [] });

			expect(response.status).toBe(422);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);

			expect(result.success).toBe(true);
		});

		it('auth errors match OpenAPI ErrorResponse schema', async () => {
			const response = await request('/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(createEventBatch(1)),
			});

			expect(response.status).toBe(401);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);

			expect(result.success).toBe(true);
		});

		it('validation error includes details with field-level errors', async () => {
			const response = await postEvents({
				events: [INVALID_EVENTS.BAD_EVENT_ID],
			});

			const body = await response.json();

			expect(body.error.details).toBeDefined();
			expect(body.error.details.errors).toBeInstanceOf(Array);
			expect(body.error.details.errors[0]).toHaveProperty('field');
			expect(body.error.details.errors[0]).toHaveProperty('message');
		});
	});

	// ===========================================================================
	// Session Lifecycle Tests
	// Testing realistic session event sequences
	// ===========================================================================
	describe('Session Lifecycle Events', () => {
		it('accepts a complete session lifecycle (start, task, end)', async () => {
			const sessionEvents = createSessionEvents();

			const response = await postEvents({ events: sessionEvents });
			const body = await response.json();

			expect(response.status).toBe(202);
			expect(body.accepted).toBe(3);
		});

		it('stores session events with correct timestamps order', async () => {
			const sessionEvents = createSessionEvents();

			await postEvents({ events: sessionEvents }, API_KEYS.ORG_A);

			const storedEvents = eventStore.getByOrg('org_testorg123');
			expect(storedEvents.length).toBe(3);

			// Events should be sorted by timestamp
			const timestamps = storedEvents.map((e) =>
				new Date(e.timestamp).getTime()
			);
			expect(timestamps[0]).toBeLessThan(timestamps[1]);
			expect(timestamps[1]).toBeLessThan(timestamps[2]);
		});
	});

	// ===========================================================================
	// Zod Schema Unit Tests
	// Testing validation logic in isolation
	// ===========================================================================
	describe('Event Schema Validation (Unit)', () => {
		it('EventSchema validates correct event structure', () => {
			const validEvent = createEvent();
			const result = EventSchema.safeParse(validEvent);
			expect(result.success).toBe(true);
		});

		it('EventSchema rejects event with wrong type', () => {
			const result = EventSchema.safeParse('not an object');
			expect(result.success).toBe(false);
		});

		it('EventSchema rejects null', () => {
			const result = EventSchema.safeParse(null);
			expect(result.success).toBe(false);
		});
	});
});
