import type {
	CreateApiKeyRequest,
	ApiKey,
	CreateApiKeyResponse,
} from '../schemas';
import type { AuthContext } from '../middleware';
import { randomBytes } from 'crypto';

/**
 * API Key Service
 * Handles CRUD operations for API keys
 */

/**
 * Generate a random API key following the format:
 * ak_{env}_{org_id}_{random}
 * Per spec: docs/03-api-specification-v1.2.md Section 4.3
 */
function generateApiKey(
	orgId: string,
	environment: 'production' | 'staging' | 'development'
): string {
	const envMap = {
		production: 'live',
		staging: 'test',
		development: 'dev',
	};
	const envCode = envMap[environment];
	const random = randomBytes(10).toString('base64url').substring(0, 20);
	return `ak_${envCode}_${orgId}_${random}`;
}

/**
 * Generate a random API secret
 * Format: sk_{env}_{random}
 */
function generateApiSecret(
	environment: 'production' | 'staging' | 'development'
): string {
	const envMap = {
		production: 'live',
		staging: 'test',
		development: 'dev',
	};
	const envCode = envMap[environment];
	const random = randomBytes(24).toString('base64url');
	return `sk_${envCode}_${random}`;
}

/**
 * Generate a unique API key ID
 */
function generateApiKeyId(): string {
	const timestamp = Date.now().toString(36);
	const random = randomBytes(6).toString('base64url').substring(0, 8);
	return `key_${timestamp}${random}`;
}

/**
 * In-memory store for API keys (MVP)
 * TODO: Replace with database-backed storage
 */
interface ApiKeyRecord {
	id: string;
	api_key: string;
	api_key_prefix: string;
	api_secret: string;
	org_id: string;
	name: string;
	scopes: string[];
	environment: 'production' | 'staging' | 'development';
	status: 'active' | 'revoked';
	created_at: Date;
	expires_at: Date | null;
	last_used_at: Date | null;
	created_by?: {
		id: string;
		name?: string;
	};
}

const API_KEY_STORE: Map<string, ApiKeyRecord> = new Map();

/**
 * Test helper: Clear API key store
 */
export function _clearApiKeyStore(): void {
	API_KEY_STORE.clear();
}

/**
 * Test helper: Set API key in store
 */
export function _setApiKeyInStore(record: ApiKeyRecord): void {
	API_KEY_STORE.set(record.id, record);
}

/**
 * Create a new API key
 */
export async function createApiKey(
	auth: AuthContext,
	request: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
	const orgId = auth.org_id;
	const userId = auth.user_id || 'system';

	const id = generateApiKeyId();
	const environment =
		request.environment || ('production' as const);
	const apiKey = generateApiKey(orgId, environment);
	const apiSecret = generateApiSecret(environment);
	const prefix = apiKey.substring(0, 32);

	const expiresAt = request.expires_at
		? new Date(request.expires_at)
		: null;

	const record: ApiKeyRecord = {
		id,
		api_key: apiKey,
		api_key_prefix: prefix,
		api_secret: apiSecret,
		org_id: orgId,
		name: request.name,
		scopes: request.scopes,
		environment,
		status: 'active',
		created_at: new Date(),
		expires_at: expiresAt,
		last_used_at: null,
		created_by: {
			id: userId,
			name: undefined,
		},
	};

	API_KEY_STORE.set(id, record);

	// Also register in middleware's in-memory store for immediate use
	// This ensures the key can be used right away for authentication
	// Use require to avoid circular dependency issues
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const middleware = require('../middleware');
		if (middleware && middleware._setInMemoryApiKey) {
			middleware._setInMemoryApiKey({
				api_key: apiKey,
				api_key_prefix: prefix,
				org_id: orgId,
				status: 'active',
			});
		}
	} catch (err) {
		// Ignore if middleware not available - key will still be accessible via service store
	}

	// Also store by prefix for lookup during authentication
	// This is a temporary MVP solution - in production, use DB
	if (process.env.NODE_ENV !== 'test') {
		try {
			const db = await import('../../../../packages/database/src');
			if (db && typeof db.insertApiKey === 'function') {
				await db.insertApiKey({
					id,
					api_key_prefix: prefix,
					org_id: orgId,
					name: request.name,
					scopes: request.scopes,
					environment,
					status: 'active',
					expires_at: expiresAt,
				});
			}
		} catch {
			// Fallback to in-memory only
		}
	}

	return {
		id,
		name: request.name,
		key: apiKey,
		secret: apiSecret,
		scopes: request.scopes,
		environment,
		expires_at: expiresAt?.toISOString() || null,
		created_at: record.created_at.toISOString(),
		_warning:
			'Store the secret securely. It cannot be retrieved again.',
	};
}

/**
 * List API keys for an organization
 */
export async function listApiKeys(auth: AuthContext): Promise<ApiKey[]> {
	const orgId = auth.org_id;

	// Get from in-memory store
	const keys: ApiKey[] = [];
	for (const record of API_KEY_STORE.values()) {
		if (record.org_id === orgId && record.status === 'active') {
			keys.push({
				id: record.id,
				name: record.name,
				prefix: record.api_key_prefix,
				scopes: record.scopes as Array<'events:write' | 'analytics:read'>,
				environment: record.environment,
				last_used_at: record.last_used_at?.toISOString() || null,
				created_at: record.created_at.toISOString(),
				expires_at: record.expires_at?.toISOString() || null,
				created_by: record.created_by,
			});
		}
	}

	// Try to get from database if available
	if (process.env.NODE_ENV !== 'test') {
		try {
			const db = await import('../../../../packages/database/src');
			if (db && typeof db.listApiKeysByOrg === 'function') {
				const dbKeys = await db.listApiKeysByOrg(orgId);
				// Merge with in-memory store, avoiding duplicates
				for (const dbKey of dbKeys) {
					if (!keys.find((k) => k.id === dbKey.id)) {
						keys.push({
							id: dbKey.id,
							name: dbKey.name || 'Unnamed',
							prefix: dbKey.api_key_prefix,
							scopes: (dbKey.scopes || ['events:write']) as Array<
								'events:write' | 'analytics:read'
							>,
							environment:
								(dbKey.environment as 'production' | 'staging' | 'development') ||
								'production',
							last_used_at: dbKey.last_used_at?.toISOString() || null,
							created_at: dbKey.created_at.toISOString(),
							expires_at: dbKey.expires_at?.toISOString() || null,
							created_by: dbKey.created_by
								? {
										id: dbKey.created_by.id,
										name: dbKey.created_by.name,
									}
								: undefined,
						});
					}
				}
			}
		} catch {
			// Fallback to in-memory only
		}
	}

	return keys.sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);
}

/**
 * Delete (revoke) an API key
 */
export async function deleteApiKey(
	auth: AuthContext,
	keyId: string
): Promise<boolean> {
	const orgId = auth.org_id;

	// Check in-memory store
	const record = API_KEY_STORE.get(keyId);
	if (record && record.org_id === orgId) {
		record.status = 'revoked';
		API_KEY_STORE.set(keyId, record);
		return true;
	}

	// Try database
	if (process.env.NODE_ENV !== 'test') {
		try {
			const db = await import('../../../../packages/database/src');
			if (db && typeof db.deleteApiKey === 'function') {
				const deleted = await db.deleteApiKey(orgId, keyId);
				if (deleted) return true;
			}
		} catch {
			// Fallback to in-memory only
		}
	}

	return false;
}

/**
 * Get API key by ID (for validation)
 */
export async function getApiKeyById(
	orgId: string,
	keyId: string
): Promise<ApiKeyRecord | null> {
	const record = API_KEY_STORE.get(keyId);
	if (record && record.org_id === orgId) {
		return record;
	}
	return null;
}

/**
 * Get API key by prefix (for authentication)
 * Returns the key even if revoked, so middleware can check status
 */
export async function getApiKeyByPrefix(
	prefix: string
): Promise<ApiKeyRecord | null> {
	// Check all records and match by prefix (prefix can be shorter than full key)
	for (const record of API_KEY_STORE.values()) {
		if (
			record.api_key.startsWith(prefix) ||
			record.api_key_prefix.startsWith(prefix) ||
			prefix.startsWith(record.api_key_prefix)
		) {
			// Return the record even if revoked - middleware will check status
			return record;
		}
	}
	return null;
}

