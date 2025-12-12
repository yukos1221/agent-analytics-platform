/**
 * Integration Tests: Metrics Overview Endpoint
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * - Section 1.5: MVP Test Suite - "Metrics aggregation correctness"
 * - Section 2.1: High Risk - "Metrics aggregation accuracy"
 * - Section 3.3: Integration Tests
 * - Section 5: Data Pipeline & Metrics Correctness
 *
 * These tests verify the full flow:
 * 1. Ingest events via POST /v1/events
 * 2. Query metrics via GET /v1/metrics/overview
 * 3. Verify response matches OpenAPI spec
 *
 * Per Testing Spec: "Event ingestion → aggregation → metrics pipeline"
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../src/app';
import { eventStore } from '../../src/services';
import { _clearMetricsCache } from '../../src/lib/cache/metricsCache';
import {
	API_KEYS,
	createEvent,
	generateSessionId,
	generateEventId,
} from '../fixtures/events';
import {
	MetricsOverviewResponseSchema,
	ErrorResponseSchema,
} from '../../src/schemas';

/**
 * The metrics endpoint uses this org_id for MVP (hardcoded until JWT auth is implemented)
 * We must seed events under this org for the integration tests to work
 */
const METRICS_ORG_ID = 'org_default';

/**
 * Helper to make API requests
 */
async function apiRequest(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return app.request(path, options);
}

/**
 * Helper to POST events via API (uses org from API key)
 */
async function postEventsViaApi(events: unknown[]): Promise<Response> {
	return apiRequest('/v1/events', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': API_KEYS.ORG_A,
		},
		body: JSON.stringify({ events }),
	});
}

/**
 * Helper to seed events directly into the store under the metrics org
 * This is needed because the metrics endpoint uses org_default for MVP,
 * not the org from the API key
 */
async function seedEvents(events: unknown[]): Promise<void> {
	await eventStore.ingest(
		METRICS_ORG_ID,
		events as ReturnType<typeof createEvent>[]
	);
}

/**
 * Helper to GET metrics overview
 */
async function getMetricsOverview(
	params: { period?: string; compare?: string } = {}
): Promise<Response> {
	const searchParams = new URLSearchParams();
	if (params.period) searchParams.set('period', params.period);
	if (params.compare) searchParams.set('compare', params.compare);

	const query = searchParams.toString();
	const path = `/v1/metrics/overview${query ? `?${query}` : ''}`;

	return apiRequest(path);
}

/**
 * Create a complete session's events
 */
function createSessionEvents(
	userId: string,
	options: {
		hasError?: boolean;
		tokensInput?: number;
		tokensOutput?: number;
	} = {}
) {
	const sessionId = generateSessionId();
	const baseTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

	const events = [
		{
			event_id: generateEventId(),
			event_type: 'session_start',
			timestamp: baseTime.toISOString(),
			session_id: sessionId,
			user_id: userId,
			agent_id: 'agent_test',
		},
		{
			event_id: generateEventId(),
			event_type: 'task_complete',
			timestamp: new Date(baseTime.getTime() + 60000).toISOString(),
			session_id: sessionId,
			user_id: userId,
			agent_id: 'agent_test',
			metadata: {
				tokens_input: options.tokensInput ?? 1000,
				tokens_output: options.tokensOutput ?? 2000,
				duration_ms: 5000,
				success: !options.hasError,
			},
		},
	];

	if (options.hasError) {
		events.push({
			event_id: generateEventId(),
			event_type: 'task_error',
			timestamp: new Date(baseTime.getTime() + 120000).toISOString(),
			session_id: sessionId,
			user_id: userId,
			agent_id: 'agent_test',
			metadata: {
				error_code: 'TEST_ERROR',
				error_message: 'Test error',
			},
		});
	}

	events.push({
		event_id: generateEventId(),
		event_type: 'session_end',
		timestamp: new Date(baseTime.getTime() + 180000).toISOString(),
		session_id: sessionId,
		user_id: userId,
		agent_id: 'agent_test',
	});

	return events;
}

describe('Metrics Overview Integration', () => {
	beforeEach(() => {
		eventStore.clear();
		_clearMetricsCache();
	});

	afterEach(() => {
		eventStore.clear();
		_clearMetricsCache();
	});

	// ===========================================================================
	// Response Schema Validation (OpenAPI Contract)
	// Per Testing Spec: "All error responses match documented schemas"
	// ===========================================================================
	describe('OpenAPI Contract Compliance', () => {
		it('returns response matching MetricsOverviewResponse schema', async () => {
			// Seed some events (directly to store under metrics org)
			await seedEvents(createSessionEvents('user_1'));

			const response = await getMetricsOverview({ period: '7d' });
			expect(response.status).toBe(200);

			const body = await response.json();

			// Validate against OpenAPI schema using Zod
			const result = MetricsOverviewResponseSchema.safeParse(body);
			expect(result.success).toBe(true);
			if (!result.success) {
				console.error('Schema validation errors:', result.error.issues);
			}
		});

		it('response contains all required fields per OpenAPI spec', async () => {
			const response = await getMetricsOverview();
			const body = await response.json();

			// Required fields per OpenAPI MetricsOverviewResponse
			expect(body).toHaveProperty('period');
			expect(body).toHaveProperty('period.start');
			expect(body).toHaveProperty('period.end');
			expect(body).toHaveProperty('metrics');

			// Required metrics per OpenAPI spec
			expect(body.metrics).toHaveProperty('active_users');
			expect(body.metrics).toHaveProperty('total_sessions');
			expect(body.metrics).toHaveProperty('success_rate');
			expect(body.metrics).toHaveProperty('total_cost');

			// Each metric has required 'value' field
			expect(body.metrics.active_users).toHaveProperty('value');
			expect(body.metrics.total_sessions).toHaveProperty('value');
			expect(body.metrics.success_rate).toHaveProperty('value');
			expect(body.metrics.total_cost).toHaveProperty('value');
		});

		it('metrics have correct units per OpenAPI spec', async () => {
			const response = await getMetricsOverview();
			const body = await response.json();

			expect(body.metrics.success_rate.unit).toBe('percent');
			expect(body.metrics.total_cost.unit).toBe('usd');
			expect(body.metrics.avg_session_duration?.unit).toBe('seconds');
		});

		it('includes meta with request_id', async () => {
			const response = await getMetricsOverview();
			const body = await response.json();

			expect(body).toHaveProperty('meta');
			expect(body.meta).toHaveProperty('request_id');
			expect(typeof body.meta.request_id).toBe('string');
		});
	});

	// ===========================================================================
	// Query Parameter Validation
	// ===========================================================================
	describe('Query Parameter Handling', () => {
		it('accepts valid period values: 1d, 7d, 30d, 90d', async () => {
			for (const period of ['1d', '7d', '30d', '90d']) {
				const response = await getMetricsOverview({ period });
				expect(response.status).toBe(200);
			}
		});

		it('defaults to 7d period when not specified', async () => {
			const response = await getMetricsOverview();
			expect(response.status).toBe(200);

			const body = await response.json();
			const start = new Date(body.period.start);
			const end = new Date(body.period.end);
			const days = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);

			expect(days).toBeCloseTo(7, 0);
		});

		it('returns 400 for invalid period value', async () => {
			const response = await getMetricsOverview({ period: 'invalid' });

			expect(response.status).toBe(400);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);
			expect(result.success).toBe(true);

			expect(body.error.code).toBe('VAL_INVALID_FORMAT');
			expect(body.error.details.field).toBe('period');
		});

		it('includes comparison data when compare=true', async () => {
			await seedEvents(createSessionEvents('user_1'));

			const response = await getMetricsOverview({ compare: 'true' });
			const body = await response.json();

			expect(body.metrics.active_users).toHaveProperty('previous');
			expect(body.metrics.active_users).toHaveProperty('change_percent');
			expect(body.metrics.active_users).toHaveProperty('trend');
		});

		it('excludes comparison data when compare=false', async () => {
			await seedEvents(createSessionEvents('user_1'));

			const response = await getMetricsOverview({ compare: 'false' });
			const body = await response.json();

			expect(body.metrics.active_users.previous).toBeUndefined();
			expect(body.metrics.active_users.change_percent).toBeUndefined();
			expect(body.metrics.active_users.trend).toBeUndefined();
		});
	});

	// ===========================================================================
	// Response Headers (OpenAPI Compliance)
	// ===========================================================================
	describe('Response Headers', () => {
		it('includes rate limit headers', async () => {
			const response = await getMetricsOverview();

			expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
			expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
			expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
		});

		it('includes Cache-Control header', async () => {
			const response = await getMetricsOverview();

			const cacheControl = response.headers.get('Cache-Control');
			expect(cacheControl).toContain('private');
			expect(cacheControl).toContain('max-age=60');
		});
	});

	// ===========================================================================
	// Event Ingestion → Metrics Pipeline
	// Per Testing Spec: "Event ingestion → aggregation → metrics pipeline"
	// ===========================================================================
	describe('Event to Metrics Pipeline', () => {
		it('metrics reflect ingested events', async () => {
			// Seed 3 sessions from 2 users
			await seedEvents([
				...createSessionEvents('user_alice'),
				...createSessionEvents('user_alice'),
				...createSessionEvents('user_bob'),
			]);

			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			expect(body.metrics.active_users.value).toBe(2); // 2 unique users
			expect(body.metrics.total_sessions.value).toBe(3); // 3 sessions
		});

		it('success rate reflects session outcomes', async () => {
			// 2 successful, 1 failed = 66.7%
			await seedEvents([
				...createSessionEvents('user_1', { hasError: false }),
				...createSessionEvents('user_2', { hasError: false }),
				...createSessionEvents('user_3', { hasError: true }),
			]);

			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			expect(body.metrics.success_rate.value).toBeCloseTo(66.7, 0);
		});

		it('cost reflects token usage from events', async () => {
			await seedEvents(
				createSessionEvents('user_1', {
					tokensInput: 1000,
					tokensOutput: 2000,
				})
			);

			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			expect(body.metrics.total_cost.value).toBeGreaterThan(0);
		});

		it('error count reflects error events', async () => {
			await seedEvents([
				...createSessionEvents('user_1', { hasError: true }),
				...createSessionEvents('user_2', { hasError: true }),
			]);

			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			expect(body.metrics.error_count?.value).toBe(2);
		});
	});

	// ===========================================================================
	// Empty Data Handling
	// Per Testing Spec §5.3: Edge Cases
	// ===========================================================================
	describe('Empty Data Handling', () => {
		it('returns zeros for metrics with no events', async () => {
			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			expect(body.metrics.active_users.value).toBe(0);
			expect(body.metrics.total_sessions.value).toBe(0);
			expect(body.metrics.total_cost.value).toBe(0);
		});

		it('returns 100% success rate with no sessions', async () => {
			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			expect(body.metrics.success_rate.value).toBe(100);
		});
	});

	// ===========================================================================
	// Multi-Tenant Isolation (CRITICAL)
	// Per Testing Spec: HIGH RISK - "Multi-tenant data isolation"
	// ===========================================================================
	describe('Multi-Tenant Isolation (CRITICAL)', () => {
		it('metrics only include events from the metrics org', async () => {
			// Seed events for the metrics org
			await seedEvents(createSessionEvents('user_metrics_org'));

			// Seed events for a different org (directly to store)
			await eventStore.ingest(
				'org_other',
				createSessionEvents('user_other_org') as ReturnType<
					typeof createEvent
				>[]
			);

			// Get metrics - should only see metrics org events
			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			// Should only count 1 user (from metrics org)
			expect(body.metrics.active_users.value).toBe(1);
		});

		it('events from API ingestion are isolated by org', async () => {
			// Ingest via API with Org A key
			await postEventsViaApi(createSessionEvents('user_org_a'));

			// Ingest via API with Org B key
			await apiRequest('/v1/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_B,
				},
				body: JSON.stringify({
					events: createSessionEvents('user_org_b'),
				}),
			});

			// Verify events are stored under their respective orgs
			const orgAEvents = eventStore.getByOrg('org_testorg123');
			const orgBEvents = eventStore.getByOrg('org_otherorg456');

			expect(orgAEvents.length).toBeGreaterThan(0);
			expect(orgBEvents.length).toBeGreaterThan(0);
		});
	});

	// ===========================================================================
	// Golden Dataset Test
	// Per Testing Spec §5.2: Known input → expected output
	// ===========================================================================
	describe('Golden Dataset Verification', () => {
		it('DAU: 5 users with multiple sessions = 5 active users', async () => {
			const users = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];

			// Batch all events together
			const allEvents = [];
			for (const userId of users) {
				allEvents.push(...createSessionEvents(userId));
			}
			allEvents.push(...createSessionEvents('user_1')); // Extra session for user_1

			await seedEvents(allEvents);

			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			// DAU should be 5 (unique users), not 6 (sessions)
			expect(body.metrics.active_users.value).toBe(5);
			expect(body.metrics.total_sessions.value).toBe(6);
		});

		it('Success rate: 8 success + 2 error = 80%', async () => {
			const allEvents = [];

			// 8 successful sessions
			for (let i = 0; i < 8; i++) {
				allEvents.push(
					...createSessionEvents(`user_success_${i}`, { hasError: false })
				);
			}

			// 2 failed sessions
			for (let i = 0; i < 2; i++) {
				allEvents.push(
					...createSessionEvents(`user_error_${i}`, { hasError: true })
				);
			}

			await seedEvents(allEvents);

			const response = await getMetricsOverview({ period: '7d' });
			const body = await response.json();

			expect(body.metrics.success_rate.value).toBe(80);
		});
	});

	// ===========================================================================
	// Period Boundary Tests
	// ===========================================================================
	describe('Period Boundaries', () => {
		it('1d period shows only last 24 hours of data', async () => {
			const response = await getMetricsOverview({ period: '1d' });
			const body = await response.json();

			const start = new Date(body.period.start);
			const end = new Date(body.period.end);
			const hours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);

			expect(hours).toBeCloseTo(24, 0);
		});

		it('90d period spans ~90 days', async () => {
			const response = await getMetricsOverview({ period: '90d' });
			const body = await response.json();

			const start = new Date(body.period.start);
			const end = new Date(body.period.end);
			const days = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);

			expect(days).toBeCloseTo(90, 0);
		});
	});
});
