import { Context, Next } from 'hono';
import { generateRequestId, ErrorResponse } from '../schemas';

/**
 * Auth context extracted from request
 */
export interface AuthContext {
	org_id: string;
	api_key_prefix: string;
	environment: 'production' | 'staging' | 'development';
}

/**
 * API Key format per spec (docs/03-api-specification-v1.2.md):
 *
 * ak_live_org_acme123_XXXXXXXXXXXXXXXXXXXX
 * └┬┘ └─┬─┘ └───┬───┘ └────────┬─────────┘
 *  │    │       │               │
 * Prefix Env   Org ID      Random (20 chars)
 *
 * Prefix: ak_ (always)
 * Environment: live | test | dev
 * Org ID: Variable length org identifier
 * Random: 20 alphanumeric characters
 */
const API_KEY_REGEX = /^ak_(live|test|dev)_(.+)_([a-zA-Z0-9]{16,20})$/;

/**
 * Parse API key to extract organization and environment info
 * For MVP, this is a basic parser without full validation
 *
 * TODO: Implement full API key validation per docs/03-api-specification-v1.2.md Section 4.3:
 * - Look up API key in database
 * - Verify HMAC signature (X-Signature header)
 * - Check timestamp freshness (X-Timestamp header, 5 min window)
 * - Validate scopes
 */
export function parseApiKey(apiKey: string): AuthContext | null {
	const match = apiKey.match(API_KEY_REGEX);
	if (!match) {
		return null;
	}

	const [, envCode, orgId] = match;

	const envMap: Record<string, AuthContext['environment']> = {
		live: 'production',
		test: 'staging',
		dev: 'development',
	};

	return {
		org_id: orgId,
		api_key_prefix: apiKey.substring(0, 32),
		environment: envMap[envCode] || 'production',
	};
}

/**
 * API Key Authentication Middleware
 *
 * Validates the X-API-Key header and extracts org_id for tenant isolation.
 * Per OpenAPI spec (specs/openapi.mvp.v1.yaml), POST /events requires ApiKeyAuth.
 *
 * For MVP Phase 1, we implement basic validation:
 * - Check X-API-Key header presence
 * - Parse API key format to extract org_id
 *
 * TODO: Phase 2 enhancements per docs/03-api-specification-v1.2.md:
 * - Validate X-Timestamp (5 minute window)
 * - Verify X-Signature (HMAC-SHA256)
 * - Look up key in database with expiration check
 * - Rate limiting per API key
 */
export function apiKeyAuth() {
	return async (c: Context, next: Next) => {
		const requestId = generateRequestId();
		const apiKey = c.req.header('X-API-Key');

		// Check for API key presence
		if (!apiKey) {
			const response: ErrorResponse = {
				error: {
					code: 'AUTH_MISSING_KEY',
					message: 'X-API-Key header is required',
					documentation_url: 'https://docs.example.com/auth#api-keys',
				},
				request_id: requestId,
			};
			return c.json(response, 401);
		}

		// Parse API key to extract auth context
		const authContext = parseApiKey(apiKey);
		if (!authContext) {
			const response: ErrorResponse = {
				error: {
					code: 'AUTH_INVALID_KEY',
					message: 'Invalid API key format',
					documentation_url: 'https://docs.example.com/auth#api-keys',
				},
				request_id: requestId,
			};
			return c.json(response, 401);
		}

		// TODO: Phase 2 - Verify signature
		// const timestamp = c.req.header('X-Timestamp');
		// const signature = c.req.header('X-Signature');
		// await verifySignature(apiKey, timestamp, signature, body);

		// Store auth context for handlers
		c.set('auth', authContext);
		c.set('requestId', requestId);

		await next();
	};
}

/**
 * Get auth context from request (type-safe helper)
 */
export function getAuthContext(c: Context): AuthContext {
	return c.get('auth') as AuthContext;
}

/**
 * Get request ID from context
 */
export function getRequestId(c: Context): string {
	return (c.get('requestId') as string) || generateRequestId();
}
