/**
 * Pipeline Integration Tests
 *
 * These tests cover Phase 1 data path per docs/06-testing-specification.md:
 * - Event ingestion via POST /v1/events (API Key auth)
 * - Metrics computation via GET /v1/metrics/overview (JWT auth)
 * - Multi-tenant isolation and caching behavior
 *
 * Summary (high-level):
 * - Protected: ingestion → storage (in-memory), tenant isolation, DAU/session/success-rate
 * - Protected: metrics cache hit behavior (via spy) and TTL expiry checks (see metrics-cache.test)
 * - Deferred: DB-backed persistence, cross-instance cache invalidation, streaming ingestion (Kinesis)
 */

import { beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import app from '../../../src/app';
import { createTestServer } from '../../helpers/http-client';
import {
	API_KEYS,
	generateEventId,
	generateSessionId,
} from '../../fixtures/events';
import {
	_setInMemoryApiKey,
	_clearInMemoryApiKeys,
} from '../../../src/middleware';
import { _clearMetricsCache } from '../../../src/lib/cache/metricsCache';
import { eventStore } from '../../../src/services';
import { computeMetricsOverview } from '../../../src/services/metricsOverviewService';
import crypto from 'crypto';

function toB64Url(obj: any) {
	return Buffer.from(JSON.stringify(obj))
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function makeHs256Token(payload: Record<string, any>, secret: string) {
	const header = { alg: 'HS256', typ: 'JWT' };
	const h = toB64Url(header);
	const p = toB64Url(payload);
	const signingInput = `${h}.${p}`;
	const sig = crypto
		.createHmac('sha256', secret)
		.update(signingInput)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	return `${h}.${p}.${sig}`;
}

// Helper to create a session's events; supports option to include an error event
function createSessionEventsForTest(
	userId: string,
	opts: { hasError?: boolean } = {}
) {
	const sessionId = generateSessionId();
	const base = new Date();
	const events: any[] = [
		{
			event_id: generateEventId(),
			event_type: 'session_start',
			timestamp: base.toISOString(),
			session_id: sessionId,
			user_id: userId,
			agent_id: 'agent_test',
			environment: 'production',
			metadata: {},
		},
		{
			event_id: generateEventId(),
			event_type: 'task_complete',
			timestamp: new Date(base.getTime() + 60_000).toISOString(),
			session_id: sessionId,
			user_id: userId,
			agent_id: 'agent_test',
			environment: 'production',
			metadata: {
				tokens_input: 1000,
				tokens_output: 2000,
				duration_ms: 5000,
				success: !opts.hasError,
			},
		},
	];

	if (opts.hasError) {
		events.push({
			event_id: generateEventId(),
			event_type: 'task_error',
			timestamp: new Date(base.getTime() + 120_000).toISOString(),
			session_id: sessionId,
			user_id: userId,
			agent_id: 'agent_test',
			environment: 'production',
			metadata: { error_code: 'E_TEST', error_message: 'failed' },
		});
	}

	events.push({
		event_id: generateEventId(),
		event_type: 'session_end',
		timestamp: new Date(base.getTime() + 180_000).toISOString(),
		session_id: sessionId,
		user_id: userId,
		agent_id: 'agent_test',
		environment: 'production',
		metadata: {},
	});

	return events;
}

describe('Pipeline Integration: ingestion -> metrics', () => {
	const server = createTestServer(app);
	let client: ReturnType<typeof server.client>;

	beforeEach(async () => {
		// Reset shared application state
		_clearMetricsCache();
		eventStore.clear();
		_clearInMemoryApiKeys();

		// Minimal JWT secret for test requests to metrics endpoint
		process.env.JWT_HS256_SECRET = 'test-secret';

		// Map API key prefixes to test org ids
		_setInMemoryApiKey({
			api_key: API_KEYS.ORG_A,
			api_key_prefix: API_KEYS.ORG_A.substring(0, 32),
			org_id: 'org_pipeline',
			status: 'active',
		});

		_setInMemoryApiKey({
			api_key: API_KEYS.ORG_B,
			api_key_prefix: API_KEYS.ORG_B.substring(0, 32),
			org_id: 'org_other_pipeline',
			status: 'active',
		});

		await server.start();
		client = server.client();
	});

	afterAll(async () => {
		await server.stop();
		_clearInMemoryApiKeys();
	});

	it('ingestion via POST /v1/events -> metrics reflect expected DAU/sessions/success-rate', async () => {
		// Build events: two users, two sessions (one success, one failed)
		const events: any[] = [];
		events.push(
			...createSessionEventsForTest('user_alpha', { hasError: false })
		);
		events.push(...createSessionEventsForTest('user_beta', { hasError: true }));

		// Post via API using API key for org_pipeline
		const postRes = await client.post(
			'/v1/events',
			{ events },
			{ 'X-API-Key': API_KEYS.ORG_A }
		);
		expect(postRes.status).toBe(202);
		// accepted should equal number of events
		expect(postRes.body.accepted).toBe(events.length);

		// Now call metrics for org_pipeline via JWT
		const token = makeHs256Token(
			{ org_id: 'org_pipeline', sub: 'tester' },
			'test-secret'
		);
		const getRes = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(getRes.status).toBe(200);

		const metrics = (getRes.body as any).metrics;
		expect(metrics.active_users.value).toBe(2); // two unique users
		expect(metrics.total_sessions.value).toBe(2); // two sessions
		// One success, one failure -> 50.0%
		expect(metrics.success_rate.value).toBeCloseTo(50.0, 0);
	});

	it('multi-tenant isolation: events from other orgs do not affect metrics', async () => {
		// Seed events for org_pipeline
		await client.post(
			'/v1/events',
			{ events: createSessionEventsForTest('user_x') },
			{ 'X-API-Key': API_KEYS.ORG_A }
		);

		// Seed events for org_other_pipeline
		await client.post(
			'/v1/events',
			{ events: createSessionEventsForTest('user_y') },
			{ 'X-API-Key': API_KEYS.ORG_B }
		);

		// Query metrics for org_pipeline only
		const token = makeHs256Token(
			{ org_id: 'org_pipeline', sub: 'tester' },
			'test-secret'
		);
		const res = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(res.status).toBe(200);
		const metrics = (res.body as any).metrics;
		// Should only include events from org_pipeline (user_x)
		expect(metrics.active_users.value).toBe(1);
	});

	it('metrics route uses cache: computeMetricsOverview called once on repeat requests (spy)', async () => {
		// Use spy to count compute invocations
		const spy = vi.spyOn(
			require('../../../src/services/metricsOverviewService'),
			'computeMetricsOverview'
		);

		// Ingest a sample event directly into store for org_cache_test
		await eventStore.ingest(
			'org_cache_test',
			createSessionEventsForTest('cache_user')
		);

		// Start a token for the org
		const token = makeHs256Token(
			{ org_id: 'org_cache_test', sub: 'cache_user' },
			'test-secret'
		);

		// Ensure TTL long enough for two calls to hit cache
		process.env.METRICS_CACHE_TTL_MS = '5000';

		const res1 = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(res1.status).toBe(200);

		const res2 = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(res2.status).toBe(200);

		// computeMetricsOverview should have been called only once (first request), second hit served from cache
		expect(spy.mock.calls.length).toBe(1);

		spy.mockRestore();
	});
});
