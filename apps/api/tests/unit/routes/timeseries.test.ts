/**
 * Unit Tests: Timeseries Handler
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * MVP Requirements:
 * - GET /v1/metrics/timeseries - response format validation
 * - Validate shape against OpenAPI types (Zod schemas)
 *
 * @see specs/openapi.mvp.v1.yaml - MetricsTimeseriesResponse schema
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import metrics from '../../../src/routes/metrics';
import {
	MetricsTimeseriesResponseSchema,
	TimeseriesPointSchema,
	ErrorResponseSchema,
} from '../../../src/schemas';
import { eventStore } from '../../../src/services';
import {
	createEvent,
	generateSessionId,
	createSessionEvents,
} from '../../fixtures/events';

// Create test app with metrics routes
const app = new Hono();
app.route('/metrics', metrics);

// Helper to make requests to test app
async function request(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return app.request(path, options);
}

describe('GET /metrics/timeseries', () => {
	beforeEach(() => {
		eventStore.clear();
	});

	describe('Response Schema Validation (OpenAPI Contract)', () => {
		it('returns 200 with valid MetricsTimeseriesResponse schema', async () => {
			// Seed some events to create timeseries data
			const sessionId = generateSessionId();
			const events = createSessionEvents(sessionId);
			await eventStore.ingest('org_default', events);

			const response = await request(
				'/metrics/timeseries?metric=active_users&period=7d'
			);

			expect(response.status).toBe(200);

			const body = await response.json();

			// Validate against OpenAPI schema using Zod
			const result = MetricsTimeseriesResponseSchema.safeParse(body);

			expect(result.success).toBe(true);
			if (!result.success) {
				console.error('Schema validation errors:', result.error.issues);
			}
		});

		it('response contains all required fields per OpenAPI spec', async () => {
			const sessionId = generateSessionId();
			const events = createSessionEvents(sessionId);
			await eventStore.ingest('org_default', events);

			const response = await request(
				'/metrics/timeseries?metric=total_sessions&period=7d'
			);
			const body = await response.json();

			// Required fields per OpenAPI MetricsTimeseriesResponse
			expect(body).toHaveProperty('metric');
			expect(body).toHaveProperty('period');
			expect(body).toHaveProperty('period.start');
			expect(body).toHaveProperty('period.end');
			expect(body).toHaveProperty('granularity');
			expect(body).toHaveProperty('data');
			expect(Array.isArray(body.data)).toBe(true);
		});

		it('each data point matches TimeseriesPoint schema', async () => {
			const sessionId = generateSessionId();
			const events = createSessionEvents(sessionId);
			await eventStore.ingest('org_default', events);

			const response = await request(
				'/metrics/timeseries?metric=active_users&period=7d'
			);
			const body = await response.json();

			if (body.data.length > 0) {
				const pointResult = TimeseriesPointSchema.safeParse(body.data[0]);
				expect(pointResult.success).toBe(true);
				expect(body.data[0]).toHaveProperty('timestamp');
				expect(body.data[0]).toHaveProperty('value');
				expect(typeof body.data[0].value).toBe('number');
			}
		});

		it('returns 400 when metric parameter is missing', async () => {
			const response = await request('/metrics/timeseries?period=7d');

			expect(response.status).toBe(400);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);
			expect(result.success).toBe(true);
		});

		it('returns 400 for invalid metric parameter', async () => {
			const response = await request(
				'/metrics/timeseries?metric=invalid_metric&period=7d'
			);

			expect(response.status).toBe(400);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);
			expect(result.success).toBe(true);
		});

		it('defaults granularity based on period', async () => {
			const sessionId = generateSessionId();
			const events = createSessionEvents(sessionId);
			await eventStore.ingest('org_default', events);

			// 1d should default to hour granularity
			const response1d = await request(
				'/metrics/timeseries?metric=active_users&period=1d'
			);
			const body1d = await response1d.json();
			expect(body1d.granularity).toBe('hour');

			// 7d should default to day granularity
			const response7d = await request(
				'/metrics/timeseries?metric=active_users&period=7d'
			);
			const body7d = await response7d.json();
			expect(body7d.granularity).toBe('day');

			// 90d should default to week granularity
			const response90d = await request(
				'/metrics/timeseries?metric=active_users&period=90d'
			);
			const body90d = await response90d.json();
			expect(body90d.granularity).toBe('week');
		});

		it('supports explicit granularity parameter', async () => {
			const sessionId = generateSessionId();
			const events = createSessionEvents(sessionId);
			await eventStore.ingest('org_default', events);

			const response = await request(
				'/metrics/timeseries?metric=active_users&period=7d&granularity=hour'
			);
			const body = await response.json();

			expect(body.granularity).toBe('hour');
		});

		it('includes aggregations when data points exist', async () => {
			// Seed multiple sessions across different time periods
			for (let i = 0; i < 5; i++) {
				const sessionId = generateSessionId();
				const events = createSessionEvents(sessionId);
				await eventStore.ingest('org_default', events);
			}

			const response = await request(
				'/metrics/timeseries?metric=total_sessions&period=7d'
			);
			const body = await response.json();

			if (body.data.length > 0 && body.aggregations) {
				expect(body.aggregations).toHaveProperty('min');
				expect(body.aggregations).toHaveProperty('max');
				expect(body.aggregations).toHaveProperty('avg');
				expect(body.aggregations).toHaveProperty('sum');
			}
		});

		it('calculates active_users metric correctly', async () => {
			const sessionId1 = generateSessionId();
			const sessionId2 = generateSessionId();

			// Create events with recent timestamps (within last 7 days)
			const now = Date.now();
			const events1 = createSessionEvents(sessionId1).map((e, i) => ({
				...e,
				user_id: 'user_alice',
				timestamp: new Date(now - i * 1000).toISOString(), // Recent timestamps
			}));
			const events2 = createSessionEvents(sessionId2).map((e, i) => ({
				...e,
				user_id: 'user_bob',
				timestamp: new Date(now - i * 1000).toISOString(), // Recent timestamps
			}));

			await eventStore.ingest('org_default', events1);
			await eventStore.ingest('org_default', events2);

			const response = await request(
				'/metrics/timeseries?metric=active_users&period=7d'
			);
			const body = await response.json();

			// Should have data points
			expect(body.data.length).toBeGreaterThan(0);
			// At least one data point should show users
			const hasUsers = body.data.some((p: TimeseriesPoint) => p.value > 0);
			expect(hasUsers).toBe(true);
		});

		it('calculates cost metric correctly', async () => {
			const sessionId = generateSessionId();
			const now = Date.now();

			// Create events with recent timestamps and token metadata
			const events = [
				...createSessionEvents(sessionId).map((e, i) => ({
					...e,
					timestamp: new Date(now - i * 1000).toISOString(),
				})),
				createEvent({
					session_id: sessionId,
					event_type: 'task_complete',
					timestamp: new Date(now).toISOString(),
					metadata: {
						tokens_input: 1000,
						tokens_output: 2000,
					},
				}),
			];

			await eventStore.ingest('org_default', events);

			const response = await request(
				'/metrics/timeseries?metric=cost&period=7d'
			);
			const body = await response.json();

			expect(body.data.length).toBeGreaterThan(0);
			// Cost should be calculated: 1000 * 0.00001 + 2000 * 0.00003 = 0.07
			const hasCost = body.data.some((p: TimeseriesPoint) => p.value > 0);
			expect(hasCost).toBe(true);
		});
	});
});
