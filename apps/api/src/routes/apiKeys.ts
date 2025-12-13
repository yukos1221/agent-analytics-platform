import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
	CreateApiKeyRequestSchema,
	ApiKeyListResponseSchema,
	generateRequestId,
	ErrorResponse,
} from '../schemas';
import { jwtAuth, getAuthContext, rateLimit } from '../middleware';
import {
	createApiKey,
	listApiKeys,
	deleteApiKey,
} from '../services/apiKeysService';

const apiKeys = new Hono();

/**
 * GET /api-keys
 * List API keys for organization
 *
 * OpenAPI: operationId: listApiKeys
 * Spec: specs/openapi.mvp.v1.yaml lines 450-485
 * Docs: docs/03-api-specification-v1.2.md Section 6.6
 *
 * Authentication: BearerAuth (JWT)
 * Required Role: admin or manager (MVP: any authenticated user)
 *
 * Response:
 * - 200 OK: ApiKeyListResponse with API keys
 * - 401 Unauthorized: Missing or invalid auth
 * - 429 Rate Limit Exceeded: Too many requests
 * - 500 Internal Error: Server error
 */
apiKeys.use('*', jwtAuth());
apiKeys.use('*', rateLimit({ scope: 'org', limit: 100, windowSeconds: 60 }));

apiKeys.get('/', async (c) => {
	const requestId = generateRequestId();
	const auth = getAuthContext(c);

	try {
		const keys = await listApiKeys(auth);

		const response = {
			data: keys,
		};

		// Validate response matches schema
		const validated = ApiKeyListResponseSchema.parse(response);

		return c.json(validated, 200);
	} catch (error) {
		const err = error as Error;
		console.error('GET /api-keys: Error:', err.message, err.stack);
		return c.json<ErrorResponse>(
			{
				error: {
					code: 'INT_SERVER_ERROR',
					message: 'Failed to retrieve API keys',
					details: {
						error: err.message,
					},
				},
				request_id: requestId,
			},
			500
		);
	}
});

/**
 * POST /api-keys
 * Create new API key
 *
 * OpenAPI: operationId: createApiKey
 * Spec: specs/openapi.mvp.v1.yaml lines 487-547
 * Docs: docs/03-api-specification-v1.2.md Section 6.6
 *
 * Authentication: BearerAuth (JWT)
 * Required Role: admin (MVP: any authenticated user)
 *
 * Request Body: CreateApiKeyRequest
 * - name: Human-readable key name (required)
 * - scopes: Array of scopes (required, min 1)
 * - environment: Target environment (optional, default: production)
 * - expires_at: Optional expiration time (ISO 8601)
 *
 * Response:
 * - 201 Created: CreateApiKeyResponse with full key and secret
 * - 400 Bad Request: Invalid request format
 * - 401 Unauthorized: Missing or invalid auth
 * - 422 Validation Error: Request body validation failed
 * - 429 Rate Limit Exceeded: Too many requests
 * - 500 Internal Error: Server error
 */
apiKeys.post(
	'/',
	zValidator('json', CreateApiKeyRequestSchema, (result, c) => {
		if (!result.success) {
			const requestId = generateRequestId();

			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join('.'),
				message: issue.message,
				received: String(
					issue.path.length > 0
						? (issue as unknown as { received?: unknown }).received ??
								issue.code
						: issue.code
				),
			}));

			const response: ErrorResponse = {
				error: {
					code: 'VAL_INVALID_FORMAT',
					message: 'Validation failed',
					details: { errors },
				},
				request_id: requestId,
			};

			return c.json(response, 422);
		}
	}),
	async (c) => {
		const requestId = generateRequestId();
		const auth = getAuthContext(c);
		const body = c.req.valid('json');

	try {
		const result = await createApiKey(auth, body);

		return c.json(result, 201);
		} catch (error) {
			const err = error as Error;
			console.error('POST /api-keys: Error:', err.message, err.stack);
			return c.json<ErrorResponse>(
				{
					error: {
						code: 'INT_SERVER_ERROR',
						message: 'Failed to create API key',
						details: {
							error: err.message,
						},
					},
					request_id: requestId,
				},
				500
			);
		}
	}
);

/**
 * DELETE /api-keys/{id}
 * Delete (revoke) API key
 *
 * OpenAPI: Not yet fully documented, but requested per user requirements
 * Docs: docs/03-api-specification-v1.2.md Section 6.6 (implied)
 *
 * Authentication: BearerAuth (JWT)
 * Required Role: admin (MVP: any authenticated user)
 *
 * Path Parameters:
 * - id: API key ID (format: key_XXXXXXXXXXXXXXXXXXXX)
 *
 * Response:
 * - 204 No Content: Key deleted successfully
 * - 401 Unauthorized: Missing or invalid auth
 * - 404 Not Found: API key not found
 * - 429 Rate Limit Exceeded: Too many requests
 * - 500 Internal Error: Server error
 */
apiKeys.delete('/:id', async (c) => {
	const requestId = generateRequestId();
	const auth = getAuthContext(c);
	const keyId = c.req.param('id');

	// Validate key ID format (more lenient to match generated IDs)
	// Format: key_{timestamp}{random} where timestamp is base36 and random is base64url
	if (!keyId.match(/^key_[a-zA-Z0-9_-]{8,}$/)) {
		return c.json<ErrorResponse>(
			{
				error: {
					code: 'VAL_INVALID_FORMAT',
					message: 'Invalid API key ID format',
					details: {
						field: 'id',
						received: keyId,
						expected: 'key_XXXXXXXXXXXXXXXXXXXX',
					},
				},
				request_id: requestId,
			},
			400
		);
	}

	try {
		const deleted = await deleteApiKey(auth, keyId);

		if (!deleted) {
			return c.json<ErrorResponse>(
				{
					error: {
						code: 'RES_NOT_FOUND',
						message: 'API key not found',
					},
					request_id: requestId,
				},
				404
			);
		}

		return c.body(null, 204);
	} catch (error) {
		const err = error as Error;
		return c.json<ErrorResponse>(
			{
				error: {
					code: 'INT_SERVER_ERROR',
					message: 'Failed to delete API key',
					details: {
						error: err.message,
					},
				},
				request_id: requestId,
			},
			500
		);
	}
});

export default apiKeys;

