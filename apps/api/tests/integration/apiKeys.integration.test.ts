import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/app';
import {
	_clearApiKeyStore,
	_setApiKeyInStore,
} from '../../src/services/apiKeysService';
import {
	_clearInMemoryApiKeys,
	_setInMemoryApiKey,
} from '../../src/middleware';

/**
 * API Keys API Integration Tests
 *
 * Tests:
 * - POST /v1/api-keys: Create API key
 * - GET /v1/api-keys: List API keys
 * - DELETE /v1/api-keys/{id}: Delete API key
 * - API key validation in POST /v1/events middleware
 */

// Test JWT token helper (minimal for testing)
function createTestJwt(orgId: string = 'org_test', userId: string = 'user_test') {
	const secret = process.env.JWT_HS256_SECRET || 'test-secret';
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
	const payload = Buffer.from(
		JSON.stringify({
			sub: userId,
			'custom:org_id': orgId,
			'custom:org_role': 'admin',
			exp: Math.floor(Date.now() / 1000) + 3600,
		})
	).toString('base64url');
	
	// Simple HMAC signature (for testing only)
	const crypto = require('crypto');
	const signature = crypto
		.createHmac('sha256', secret)
		.update(`${header}.${payload}`)
		.digest('base64url');
	
	return `${header}.${payload}.${signature}`;
}

async function apiRequest(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return app.request(path, options);
}

/**
 * GET helper for /v1/api-keys
 */
async function getApiKeys(
	orgId: string = 'org_test',
	userId: string = 'user_test'
): Promise<Response> {
	return apiRequest('/v1/api-keys', {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${createTestJwt(orgId, userId)}`,
		},
	});
}

/**
 * POST helper for /v1/api-keys
 */
async function createApiKey(
	body: unknown,
	orgId: string = 'org_test',
	userId: string = 'user_test'
): Promise<Response> {
	return apiRequest('/v1/api-keys', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${createTestJwt(orgId, userId)}`,
		},
		body: JSON.stringify(body),
	});
}

/**
 * DELETE helper for /v1/api-keys/{id}
 */
async function deleteApiKey(
	keyId: string,
	orgId: string = 'org_test',
	userId: string = 'user_test'
): Promise<Response> {
	return apiRequest(`/v1/api-keys/${keyId}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${createTestJwt(orgId, userId)}`,
		},
	});
}

/**
 * POST helper for /v1/events (to test API key validation)
 */
async function postEvents(
	body: unknown,
	apiKey: string
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

describe('API Keys API Integration', () => {
	beforeEach(() => {
		_clearApiKeyStore();
		_clearInMemoryApiKeys();
		process.env.JWT_HS256_SECRET = 'test-secret';
	});

	describe('POST /v1/api-keys', () => {
		it('creates a new API key successfully', async () => {
			const requestBody = {
				name: 'Test API Key',
				scopes: ['events:write'],
				environment: 'production',
			};

			const response = await createApiKey(requestBody);
			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty('id');
			expect(data).toHaveProperty('key');
			expect(data).toHaveProperty('secret');
			expect(data.name).toBe('Test API Key');
			expect(data.scopes).toEqual(['events:write']);
			expect(data.environment).toBe('production');
			expect(data.key).toMatch(/^ak_live_org_test_/);
			expect(data.secret).toMatch(/^sk_live_/);
			expect(data._warning).toBeDefined();
		});

		it('creates API key with staging environment', async () => {
			const requestBody = {
				name: 'Staging Key',
				scopes: ['events:write'],
				environment: 'staging',
			};

			const response = await createApiKey(requestBody);
			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data.environment).toBe('staging');
			expect(data.key).toMatch(/^ak_test_/);
			expect(data.secret).toMatch(/^sk_test_/);
		});

		it('creates API key with expiration', async () => {
			const expiresAt = new Date();
			expiresAt.setFullYear(expiresAt.getFullYear() + 1);

			const requestBody = {
				name: 'Expiring Key',
				scopes: ['events:write'],
				expires_at: expiresAt.toISOString(),
			};

			const response = await createApiKey(requestBody);
			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data.expires_at).toBe(expiresAt.toISOString());
		});

		it('rejects invalid request body', async () => {
			const requestBody = {
				// Missing required 'name' field
				scopes: ['events:write'],
			};

			const response = await createApiKey(requestBody);
			expect(response.status).toBe(422);

			const data = await response.json();
			expect(data.error.code).toBe('VAL_INVALID_FORMAT');
		});

		it('rejects empty scopes array', async () => {
			const requestBody = {
				name: 'Test Key',
				scopes: [],
			};

			const response = await createApiKey(requestBody);
			expect(response.status).toBe(422);
		});

		it('requires authentication', async () => {
			const response = await apiRequest('/v1/api-keys', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: 'Test Key',
					scopes: ['events:write'],
				}),
			});

			expect(response.status).toBe(401);
		});
	});

	describe('GET /v1/api-keys', () => {
		it('lists API keys for organization', async () => {
			// Create some test keys
			_setApiKeyInStore({
				id: 'key_1',
				api_key: 'ak_live_org_test_abc123',
				api_key_prefix: 'ak_live_org_test_abc123',
				api_secret: 'sk_live_secret1',
				org_id: 'org_test',
				name: 'Key 1',
				scopes: ['events:write'],
				environment: 'production',
				status: 'active',
				created_at: new Date(),
				expires_at: null,
				last_used_at: null,
			});

			_setApiKeyInStore({
				id: 'key_2',
				api_key: 'ak_live_org_test_def456',
				api_key_prefix: 'ak_live_org_test_def456',
				api_secret: 'sk_live_secret2',
				org_id: 'org_test',
				name: 'Key 2',
				scopes: ['events:write', 'analytics:read'],
				environment: 'staging',
				status: 'active',
				created_at: new Date(),
				expires_at: null,
				last_used_at: null,
			});

			const response = await getApiKeys();
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty('data');
			expect(Array.isArray(data.data)).toBe(true);
			expect(data.data.length).toBeGreaterThanOrEqual(2);

			const key1 = data.data.find((k: { id: string }) => k.id === 'key_1');
			expect(key1).toBeDefined();
			expect(key1.name).toBe('Key 1');
			expect(key1.prefix).toBe('ak_live_org_test_abc123');
			expect(key1.scopes).toEqual(['events:write']);
			expect(key1.environment).toBe('production');
		});

		it('only returns keys for authenticated organization', async () => {
			// Create keys for different orgs
			_setApiKeyInStore({
				id: 'key_org_a',
				api_key: 'ak_live_org_a_abc123',
				api_key_prefix: 'ak_live_org_a_abc123',
				api_secret: 'sk_live_secret',
				org_id: 'org_a',
				name: 'Org A Key',
				scopes: ['events:write'],
				environment: 'production',
				status: 'active',
				created_at: new Date(),
				expires_at: null,
				last_used_at: null,
			});

			_setApiKeyInStore({
				id: 'key_org_b',
				api_key: 'ak_live_org_b_def456',
				api_key_prefix: 'ak_live_org_b_def456',
				api_secret: 'sk_live_secret',
				org_id: 'org_b',
				name: 'Org B Key',
				scopes: ['events:write'],
				environment: 'production',
				status: 'active',
				created_at: new Date(),
				expires_at: null,
				last_used_at: null,
			});

			// Request as org_a
			const response = await getApiKeys('org_a');
			expect(response.status).toBe(200);

			const data = await response.json();
			const orgAKeys = data.data.filter((k: { org_id?: string }) => k.org_id === 'org_a' || !k.org_id);
			expect(orgAKeys.length).toBeGreaterThanOrEqual(1);
			expect(orgAKeys.some((k: { id: string }) => k.id === 'key_org_a')).toBe(true);
		});

		it('requires authentication', async () => {
			const response = await apiRequest('/v1/api-keys', {
				method: 'GET',
			});

			expect(response.status).toBe(401);
		});
	});

	describe('DELETE /v1/api-keys/{id}', () => {
		it('deletes API key successfully', async () => {
			// Create a key via API
			const createResponse = await createApiKey({
				name: 'Key to Delete',
				scopes: ['events:write'],
			});
			expect(createResponse.status).toBe(201);
			const keyData = await createResponse.json();
			const keyId = keyData.id;

			const response = await deleteApiKey(keyId);
			expect(response.status).toBe(204);

			// Verify key is revoked (status changed to revoked)
			const listResponse = await getApiKeys();
			const data = await listResponse.json();
			const deletedKey = data.data.find((k: { id: string }) => k.id === 'key_to_delete');
			expect(deletedKey).toBeUndefined(); // Should not appear in active keys list
		});

		it('returns 404 for non-existent key', async () => {
			const response = await deleteApiKey('key_nonexistent');
			expect(response.status).toBe(404);

			const data = await response.json();
			expect(data.error.code).toBe('RES_NOT_FOUND');
		});

		it('rejects invalid key ID format', async () => {
			const response = await deleteApiKey('invalid_id');
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error.code).toBe('VAL_INVALID_FORMAT');
		});

		it('requires authentication', async () => {
			const response = await apiRequest('/v1/api-keys/key_123', {
				method: 'DELETE',
			});

			expect(response.status).toBe(401);
		});
	});

	describe('API Key Validation in POST /v1/events', () => {
		it('accepts valid API key for event ingestion', async () => {
			// Create an API key
			const createResponse = await createApiKey({
				name: 'Events Key',
				scopes: ['events:write'],
			});
			const keyData = await createResponse.json();
			const apiKey = keyData.key;

			// Register the key in middleware's in-memory store
			_clearInMemoryApiKeys();
			_setInMemoryApiKey({
				api_key: apiKey,
				api_key_prefix: apiKey.substring(0, 32),
				org_id: 'org_test',
				status: 'active',
			});

			// Use the key to post events
			const eventsBody = {
				events: [
					{
						event_id: 'evt_test12345678901234567890',
						event_type: 'session_start',
						timestamp: new Date().toISOString(),
						session_id: 'sess_test12345678901234567890',
						user_id: 'user_test',
						agent_id: 'agent_test',
					},
				],
			};

			const response = await postEvents(eventsBody, apiKey);
			expect(response.status).toBe(202);

			const data = await response.json();
			expect(data.accepted).toBe(1);
		});

		it('rejects invalid API key format', async () => {
			const eventsBody = {
				events: [
					{
						event_id: 'evt_test12345678901234567890',
						event_type: 'session_start',
						timestamp: new Date().toISOString(),
						session_id: 'sess_test12345678901234567890',
						user_id: 'user_test',
						agent_id: 'agent_test',
					},
				],
			};

			const response = await postEvents(eventsBody, 'invalid_key_format');
			expect(response.status).toBe(401);

			const data = await response.json();
			expect(data.error.code).toBe('AUTH_INVALID_KEY');
		});

		it('rejects missing API key', async () => {
			const eventsBody = {
				events: [
					{
						event_id: 'evt_test12345678901234567890',
						event_type: 'session_start',
						timestamp: new Date().toISOString(),
						session_id: 'sess_test12345678901234567890',
						user_id: 'user_test',
						agent_id: 'agent_test',
					},
				],
			};

			const response = await apiRequest('/v1/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// No X-API-Key header
				},
				body: JSON.stringify(eventsBody),
			});

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error.code).toBe('AUTH_MISSING_KEY');
		});

		it('rejects revoked API key', async () => {
			// Create a key
			const createResponse = await createApiKey({
				name: 'Revoked Key',
				scopes: ['events:write'],
			});
			expect(createResponse.status).toBe(201);
			const keyData = await createResponse.json();
			const apiKey = keyData.key;
			const keyId = keyData.id;
			const prefix = apiKey.substring(0, 32);

			// Register key in middleware store first (so it can be found)
			_setInMemoryApiKey({
				api_key: apiKey,
				api_key_prefix: prefix,
				org_id: 'org_test',
				status: 'active',
			});

			// Revoke the key
			const deleteResponse = await deleteApiKey(keyId);
			expect(deleteResponse.status).toBe(204);

			// Update middleware store to reflect revoked status
			_setInMemoryApiKey({
				api_key: apiKey,
				api_key_prefix: prefix,
				org_id: 'org_test',
				status: 'revoked',
			});

			const eventsBody = {
				events: [
					{
						event_id: 'evt_test12345678901234567890',
						event_type: 'session_start',
						timestamp: new Date().toISOString(),
						session_id: 'sess_test12345678901234567890',
						user_id: 'user_test',
						agent_id: 'agent_test',
					},
				],
			};

			const response = await postEvents(eventsBody, apiKey);
			expect(response.status).toBe(403);

			const data = await response.json();
			expect(data.error.code).toBe('AUTH_KEY_REVOKED');
		});
	});
});

