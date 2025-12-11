import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/app';
import {
	_clearRateStore,
	_clearInMemoryApiKeys,
	_setInMemoryApiKey,
} from '../src/middleware';

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

describe('Auth and API key behavior (MVP)', () => {
	beforeEach(() => {
		_clearRateStore();
		_clearInMemoryApiKeys();
		process.env.JWT_HS256_SECRET = 'testsecret';
		// add a default active key
		_setInMemoryApiKey({
			api_key: 'ak_live_org_acme123_abcd1234abcd1234',
			api_key_prefix: 'ak_live_org_acme123_abcd1234',
			org_id: 'acme123',
			agent_id: 'agent_claude_code',
			integration_id: 'sdk-js-1',
			status: 'active',
		});
	});

	it('JWT valid token attaches org_id and user_id (GET /v1/metrics/overview)', async () => {
		const token = makeJwt(
			{
				'custom:org_id': 'org_jwt',
				sub: 'user_x',
				exp: Math.floor(Date.now() / 1000) + 3600,
			},
			process.env.JWT_HS256_SECRET!
		);

		const res = await app.fetch(
			new Request('http://localhost/v1/metrics/overview', {
				headers: { Authorization: `Bearer ${token}` },
			})
		);
		expect(res.status).toBe(200);
		const j = await res.json();
		expect(j.meta).toBeTruthy();
		expect(j.meta.request_id).toBeTruthy();
	});

	it('JWT missing token returns 401 on protected route', async () => {
		const res = await app.fetch(
			new Request('http://localhost/v1/metrics/overview')
		);
		expect(res.status).toBe(401);
		const j = await res.json();
		expect(j.error.code).toBe('AUTH_MISSING_TOKEN');
	});

	it('API key valid allows POST /v1/events', async () => {
		// craft a valid event
		const event = {
			event_id: 'evt_abcdefghijklmnopqrst',
			event_type: 'session_start',
			timestamp: new Date().toISOString(),
			session_id: 'sess_abcdefghijklmnopqr',
			user_id: 'user_test',
			agent_id: 'agent_claude_code',
			environment: 'production',
		};

		const res = await app.fetch(
			new Request('http://localhost/v1/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': 'ak_live_org_acme123_abcd1234abcd1234',
				},
				body: JSON.stringify({ events: [event] }),
			})
		);

		expect(res.status).toBe(202);
		const j = await res.json();
		expect(typeof j.accepted).toBe('number');
	});

	it('API key revoked returns 403', async () => {
		// set revoked key with same prefix
		_setInMemoryApiKey({
			api_key: 'ak_live_org_acme123_revokedrevokedrev',
			api_key_prefix: 'ak_live_org_acme123_abcd1234',
			org_id: 'acme123',
			agent_id: 'agent_claude_code',
			integration_id: 'sdk-js-1',
			status: 'revoked',
		});

		const event = {
			event_id: 'evt_abcdefghijklmnopqr1',
			event_type: 'session_start',
			timestamp: new Date().toISOString(),
			session_id: 'sess_abcdefghijklmnopq1',
			user_id: 'user_test',
			agent_id: 'agent_claude_code',
			environment: 'production',
		};

		const res = await app.fetch(
			new Request('http://localhost/v1/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': 'ak_live_org_acme123_abcd1234abcd1234',
				},
				body: JSON.stringify({ events: [event] }),
			})
		);

		expect(res.status).toBe(403);
		const j = await res.json();
		expect(j.error.code).toBe('AUTH_KEY_REVOKED');
	});

	it('Invalid API key format returns 401', async () => {
		const res = await app.fetch(
			new Request('http://localhost/v1/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-API-Key': 'badkey' },
				body: JSON.stringify({ events: [] }),
			})
		);

		expect(res.status).toBe(401);
		const j = await res.json();
		expect(j.error.code).toBe('AUTH_INVALID_KEY');
	});
});
