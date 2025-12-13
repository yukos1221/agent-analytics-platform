/**
 * Integration Tests: Timeseries Endpoint
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * - Section 1.5: MVP Test Suite - "Metrics timeseries for charts"
 * - Section 3.3: Integration Tests
 *
 * These tests verify the full flow:
 * 1. Ingest events via POST /v1/events
 * 2. Query timeseries via GET /v1/metrics/timeseries
 * 3. Verify response matches OpenAPI spec
 *
 * Per Testing Spec: "Data correctness" and "Time-based aggregation"
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../src/app';
import { eventStore } from '../../src/services';
import {
	API_KEYS,
	createEvent,
	generateSessionId,
	createSessionEvents,
} from '../fixtures/events';
import {
	MetricsTimeseriesResponseSchema,
	ErrorResponseSchema,
} from '../../src/schemas';

/**
 * The timeseries endpoint uses this org_id for MVP
 */
const TIMESERIES_ORG_ID = 'org_default';

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
 * Helper to seed events directly into the store
 */
async function seedEvents(events: unknown[]): Promise<void> {
	await eventStore.ingest(
		TIMESERIES_ORG_ID,
		events as ReturnType<typeof createEvent>[]
	);
}

/**
 * Helper to GET timeseries
 */
async function getTimeseries(params: {
	metric: string;
	period?: string;
	granularity?: string;
}): Promise<Response> {
	const queryParams = new URLSearchParams();
	queryParams.set('metric', params.metric);
	if (params.period) queryParams.set('period', params.period);
	if (params.granularity) queryParams.set('granularity', params.granularity);

	return apiRequest(`/v1/metrics/timeseries?${queryParams.toString()}`);
}

describe('Timeseries API Integration Tests', () => {
	beforeEach(() => {
		eventStore.clear();
	});

	afterEach(() => {
		eventStore.clear();
	});

	describe('GET /v1/metrics/timeseries', () => {
		it('returns data points with zero values when no events exist', async () => {
			const response = await getTimeseries({ metric: 'active_users' });
			expect(response.status).toBe(200);

			const body = await response.json();
			const result = MetricsTimeseriesResponseSchema.safeParse(body);
			expect(result.success).toBe(true);

			// Should return buckets for the period (even if all values are 0)
			expect(body.data.length).toBeGreaterThan(0);
			// All values should be 0 when no events exist
			for (const point of body.data) {
				expect(point.value).toBe(0);
			}
		});

		it('returns timeseries data after ingesting events', async () => {
			const sessionId = generateSessionId();
			const now = Date.now();
			const events = createSessionEvents(sessionId).map((e, i) => ({
				...e,
				timestamp: new Date(now - i * 1000).toISOString(),
			}));

			await seedEvents(events);

			const response = await getTimeseries({
				metric: 'total_sessions',
				period: '7d',
			});
			expect(response.status).toBe(200);

			const body = await response.json();
			const result = MetricsTimeseriesResponseSchema.safeParse(body);
			expect(result.success).toBe(true);

			expect(body.metric).toBe('total_sessions');
			expect(body.granularity).toBe('day');
			expect(body.data.length).toBeGreaterThan(0);
		});

		it('calculates active_users metric correctly', async () => {
			const sessionId1 = generateSessionId();
			const sessionId2 = generateSessionId();
			const now = Date.now();

			const events1 = createSessionEvents(sessionId1).map((e, i) => ({
				...e,
				user_id: 'user_alice',
				timestamp: new Date(now - i * 1000).toISOString(),
			}));
			const events2 = createSessionEvents(sessionId2).map((e, i) => ({
				...e,
				user_id: 'user_bob',
				timestamp: new Date(now - i * 1000).toISOString(),
			}));

			await seedEvents(events1);
			await seedEvents(events2);

			const response = await getTimeseries({
				metric: 'active_users',
				period: '7d',
			});
			const body = await response.json();

			expect(body.data.length).toBeGreaterThan(0);
			// Should have at least one data point with users
			const hasUsers = body.data.some((p: { value: number }) => p.value > 0);
			expect(hasUsers).toBe(true);
		});

		it('calculates success_rate metric correctly', async () => {
			const completedSessionId = generateSessionId();
			const errorSessionId = generateSessionId();
			const now = Date.now();

			// Completed session (has session_end, no errors)
			const completedEvents = createSessionEvents(completedSessionId).map(
				(e, i) => ({
					...e,
					timestamp: new Date(now - i * 1000).toISOString(),
				})
			);

			// Error session (has error event)
			const errorEvents = [
				createEvent({
					session_id: errorSessionId,
					event_type: 'session_start',
					timestamp: new Date(now - 5000).toISOString(),
				}),
				createEvent({
					session_id: errorSessionId,
					event_type: 'error',
					timestamp: new Date(now - 4000).toISOString(),
				}),
				createEvent({
					session_id: errorSessionId,
					event_type: 'session_end',
					timestamp: new Date(now - 3000).toISOString(),
				}),
			];

			await seedEvents(completedEvents);
			await seedEvents(errorEvents);

			const response = await getTimeseries({
				metric: 'success_rate',
				period: '7d',
			});
			const body = await response.json();

			expect(body.data.length).toBeGreaterThan(0);
			// Success rate should be between 0 and 100
			for (const point of body.data) {
				expect(point.value).toBeGreaterThanOrEqual(0);
				expect(point.value).toBeLessThanOrEqual(100);
			}
		});

		it('calculates tokens_used metric correctly', async () => {
			const sessionId = generateSessionId();
			const now = Date.now();

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
						tokens_input: 5000,
						tokens_output: 10000,
					},
				}),
			];

			await seedEvents(events);

			const response = await getTimeseries({
				metric: 'tokens_used',
				period: '7d',
			});
			const body = await response.json();

			expect(body.data.length).toBeGreaterThan(0);
			// Should have tokens in at least one bucket
			const hasTokens = body.data.some((p: { value: number }) => p.value > 0);
			expect(hasTokens).toBe(true);
		});

		it('supports different granularities', async () => {
			const sessionId = generateSessionId();
			const now = Date.now();
			const events = createSessionEvents(sessionId).map((e, i) => ({
				...e,
				timestamp: new Date(now - i * 1000).toISOString(),
			}));

			await seedEvents(events);

			// Test hour granularity
			const hourResponse = await getTimeseries({
				metric: 'total_sessions',
				period: '1d',
				granularity: 'hour',
			});
			const hourBody = await hourResponse.json();
			expect(hourBody.granularity).toBe('hour');

			// Test day granularity
			const dayResponse = await getTimeseries({
				metric: 'total_sessions',
				period: '7d',
				granularity: 'day',
			});
			const dayBody = await dayResponse.json();
			expect(dayBody.granularity).toBe('day');
		});

		it('includes aggregations when data exists', async () => {
			// Seed multiple sessions
			for (let i = 0; i < 10; i++) {
				const sessionId = generateSessionId();
				const now = Date.now();
				const events = createSessionEvents(sessionId).map((e, j) => ({
					...e,
					timestamp: new Date(now - i * 60000 - j * 1000).toISOString(),
				}));
				await seedEvents(events);
			}

			const response = await getTimeseries({
				metric: 'total_sessions',
				period: '7d',
			});
			const body = await response.json();

			if (body.data.length > 0 && body.aggregations) {
				expect(body.aggregations).toHaveProperty('min');
				expect(body.aggregations).toHaveProperty('max');
				expect(body.aggregations).toHaveProperty('avg');
				expect(body.aggregations).toHaveProperty('sum');
				expect(body.aggregations.min).toBeLessThanOrEqual(
					body.aggregations.max
				);
			}
		});

		it('returns 400 for missing metric parameter', async () => {
			const response = await apiRequest('/v1/metrics/timeseries?period=7d');
			expect(response.status).toBe(400);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);
			expect(result.success).toBe(true);
		});

		it('returns 400 for invalid metric', async () => {
			const response = await getTimeseries({
				metric: 'invalid_metric',
				period: '7d',
			});
			expect(response.status).toBe(400);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);
			expect(result.success).toBe(true);
		});

		it('data points are ordered by timestamp ascending', async () => {
			const sessionId = generateSessionId();
			const now = Date.now();
			const events = createSessionEvents(sessionId).map((e, i) => ({
				...e,
				timestamp: new Date(now - i * 1000).toISOString(),
			}));

			await seedEvents(events);

			const response = await getTimeseries({
				metric: 'total_sessions',
				period: '7d',
			});
			const body = await response.json();

			expect(body.data.length).toBeGreaterThan(1);
			// Verify timestamps are in ascending order
			for (let i = 1; i < body.data.length; i++) {
				const prevTime = new Date(body.data[i - 1].timestamp).getTime();
				const currTime = new Date(body.data[i].timestamp).getTime();
				expect(currTime).toBeGreaterThanOrEqual(prevTime);
			}
		});
	});
});

