import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import app from '../src/app';
import { createTestServer } from './helpers/http-client';
import { _clearMetricsCache } from '../src/lib/cache/metricsCache';
import { eventStore } from '../src/services';

import crypto from 'crypto';

function makeHs256Token(payload: Record<string, any>, secret: string) {
	const header = { alg: 'HS256', typ: 'JWT' };
	const toB64Url = (obj: any) =>
		Buffer.from(JSON.stringify(obj))
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

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

describe('Metrics cache', () => {
	const server = createTestServer(app);
	let client: ReturnType<typeof server.client>;

	beforeEach(async () => {
		_clearMetricsCache();
		// Clear in-memory events
		eventStore.clear();
		process.env.JWT_HS256_SECRET = 'test-secret';
		// start server if not started
		await server.start();
		client = server.client();
	});

	afterAll(async () => {
		await server.stop();
	});

	it('first call computes metrics, second call hits cache', async () => {
		// Insert a sample event for org 'org_test'
		await eventStore.ingest('org_test', [
			{
				event_id: 'evt_1',
				event_type: 'session_start',
				timestamp: new Date().toISOString(),
				session_id: 'sess_1',
				user_id: 'user_1',
				agent_id: 'agent_a',
				environment: 'production',
				metadata: {},
			},
		] as any);

		const token = makeHs256Token(
			{ org_id: 'org_test', sub: 'user_1' },
			'test-secret'
		);

		// Ensure default TTL is reasonable
		process.env.METRICS_CACHE_TTL_MS = '5000';

		const res1 = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(res1.status).toBe(200);
		expect(res1.body.meta?.cache_hit).toBe(false);

		const res2 = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(res2.status).toBe(200);
		expect(res2.body.meta?.cache_hit).toBe(true);
	});

	it('cache expires after TTL', async () => {
		await eventStore.ingest('org_test', [
			{
				event_id: 'evt_2',
				event_type: 'session_start',
				timestamp: new Date().toISOString(),
				session_id: 'sess_2',
				user_id: 'user_2',
				agent_id: 'agent_b',
				environment: 'production',
				metadata: {},
			},
		] as any);

		const token = makeHs256Token(
			{ org_id: 'org_test', sub: 'user_2' },
			'test-secret'
		);

		// Set small TTL for test
		process.env.METRICS_CACHE_TTL_MS = '100';

		const r1 = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(r1.status).toBe(200);
		expect(r1.body.meta?.cache_hit).toBe(false);

		// Wait for expiry
		await new Promise((r) => setTimeout(r, 200));

		const r2 = await client.get('/v1/metrics/overview?period=7d', {
			Authorization: `Bearer ${token}`,
		});
		expect(r2.status).toBe(200);
		// After expiry, should recompute -> cache_hit false
		expect(r2.body.meta?.cache_hit).toBe(false);
	});
});
