import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/app';
import { _clearRateStore, _setRateWindow } from '../src/middleware';

// Helper to create HS256 JWT (matching middleware.verifyJwtHs256)
import crypto from 'crypto';

function base64url(input: string) {
	return Buffer.from(input)
		.toString('base64')
		.replace(/=+$/, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

function makeJwt(payload: Record<string, unknown>, secret: string) {
	const header = { alg: 'HS256', typ: 'JWT' };
	const h = base64url(JSON.stringify(header));
	const p = base64url(JSON.stringify(payload));
	const sig = crypto
		.createHmac('sha256', secret)
		.update(`${h}.${p}`)
		.digest('base64')
		.replace(/=+$/, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
	return `${h}.${p}.${sig}`;
}

describe('Rate limiter', () => {
	beforeEach(() => {
		_clearRateStore();
		process.env.JWT_HS256_SECRET = 'testsecret';
	});

	it('returns 429 for org-scoped limit exceeded on /v1/metrics/overview', async () => {
		const orgId = 'org_test';
		const token = makeJwt(
			{
				'custom:org_id': orgId,
				sub: 'user_a',
				exp: Math.floor(Date.now() / 1000) + 3600,
			},
			process.env.JWT_HS256_SECRET!
		);

		// Simulate bucket already exhausted: limit=100 windowSeconds=60 in route config
		const bucketKey = `org:${orgId}`;
		// set windowStart to now and count to 100 (exhausted)
		_setRateWindow(bucketKey, Math.floor(Date.now() / 1000), 100);

		const req = new Request('http://localhost/v1/metrics/overview', {
			headers: { Authorization: `Bearer ${token}` },
		});

		const res = await app.fetch(req);
		expect(res.status).toBe(429);
		const j = await res.json();
		expect(j.error.code).toBe('RATE_LIMIT_EXCEEDED');
		expect(res.headers.get('Retry-After')).toBeTruthy();
	});

	it('returns 429 for api_key-scoped limit exceeded on POST /v1/events', async () => {
		// Use example in-memory API key from middleware
		const apiKey = 'ak_live_org_acme123_abcd1234abcd1234';
		const prefix = apiKey.substring(0, 32);
		const bucketKey = `ak:${prefix}`;
		_setRateWindow(bucketKey, Math.floor(Date.now() / 1000), 1000);

		const req = new Request('http://localhost/v1/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
			body: JSON.stringify({ events: [] }),
		});

		const res = await app.fetch(req);
		expect(res.status).toBe(429);
		const j = await res.json();
		expect(j.error.code).toBe('RATE_LIMIT_EXCEEDED');
	});
});
