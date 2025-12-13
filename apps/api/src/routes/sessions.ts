import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
	SessionListQuerySchema,
	SessionListResponseSchema,
	SessionDetailResponseSchema,
	generateRequestId,
	ErrorResponse,
} from '../schemas';
import { jwtAuth, getAuthContext, rateLimit } from '../middleware';
import { listSessions, getSessionDetail } from '../services/sessionsService';

const sessions = new Hono();

/**
 * GET /sessions
 * List sessions with pagination and filtering
 *
 * OpenAPI: operationId: listSessions
 * Spec: specs/openapi.mvp.v1.yaml lines 307-401
 * Docs: docs/03-api-specification-v1.2.md Section 6.3
 *
 * Authentication: BearerAuth (JWT)
 * Query Parameters:
 * - start_time: Filter sessions started after this time (ISO 8601)
 * - end_time: Filter sessions started before this time (ISO 8601)
 * - status: Filter by session status (active, completed, error)
 * - agent_id: Filter by agent ID
 * - user_id: Filter by user ID
 * - sort: Sort order (started_at, -started_at, duration, -duration)
 * - limit: Maximum number of results (1-100, default: 25)
 * - cursor: Pagination cursor from previous response
 *
 * Response:
 * - 200 OK: SessionListResponse with paginated sessions
 * - 400 Bad Request: Invalid query parameters
 * - 401 Unauthorized: Missing or invalid auth
 * - 429 Rate Limit Exceeded: Too many requests
 * - 500 Internal Error: Server error
 */
// Protect sessions routes with JWT auth
sessions.use('*', jwtAuth());
// Apply org-scoped rate limit: 100 requests per 60s (MVP)
sessions.use('*', rateLimit({ scope: 'org', limit: 100, windowSeconds: 60 }));

sessions.get(
	'/',
	zValidator('query', SessionListQuerySchema, (result, c) => {
		if (!result.success) {
			return c.json<ErrorResponse>(
				{
					error: {
						code: 'VAL_INVALID_FORMAT',
						message: 'Invalid query parameters',
						details: {
							errors: result.error.errors,
						},
					},
					request_id: generateRequestId(),
				},
				400
			);
		}
	}),
	async (c) => {
		const requestId = generateRequestId();
		const auth = getAuthContext(c);
		const orgId = auth?.org_id || 'org_default';

		try {
			const query = c.req.valid('query');

			const result = await listSessions(orgId, query);

			return c.json(
				{
					...result,
					meta: {
						request_id: requestId,
					},
				},
				200
			);
		} catch (error) {
			const err = error as Error;
			return c.json<ErrorResponse>(
				{
					error: {
						code: 'INT_SERVER_ERROR',
						message: 'Failed to retrieve sessions',
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
 * GET /sessions/{session_id}
 * Get session details
 *
 * OpenAPI: operationId: getSession
 * Spec: specs/openapi.mvp.v1.yaml lines 403-445
 * Docs: docs/03-api-specification-v1.2.md Section 6.3
 *
 * Authentication: BearerAuth (JWT)
 * Path Parameters:
 * - session_id: Session ID (format: sess_XXXXXXXXXXXXXXXXXXXX)
 *
 * Response:
 * - 200 OK: SessionDetailResponse with session details
 * - 401 Unauthorized: Missing or invalid auth
 * - 404 Not Found: Session not found
 * - 429 Rate Limit Exceeded: Too many requests
 * - 500 Internal Error: Server error
 */
sessions.get('/:session_id', async (c) => {
	const requestId = generateRequestId();
	const auth = getAuthContext(c);
	const orgId = auth?.org_id || 'org_default';
	const sessionId = c.req.param('session_id');

	// Validate session ID format
	if (!sessionId.match(/^sess_[a-zA-Z0-9]{20,30}$/)) {
		return c.json<ErrorResponse>(
			{
				error: {
					code: 'VAL_INVALID_FORMAT',
					message: 'Invalid session ID format',
					details: {
						field: 'session_id',
						received: sessionId,
						expected: 'sess_XXXXXXXXXXXXXXXXXXXX',
					},
				},
				request_id: requestId,
			},
			400
		);
	}

	try {
		const session = await getSessionDetail(orgId, sessionId);

		if (!session) {
			return c.json<ErrorResponse>(
				{
					error: {
						code: 'RES_NOT_FOUND',
						message: 'Session not found',
					},
					request_id: requestId,
				},
				404
			);
		}

		return c.json(session, 200);
	} catch (error) {
		const err = error as Error;
		return c.json<ErrorResponse>(
			{
				error: {
					code: 'INT_SERVER_ERROR',
					message: 'Failed to retrieve session details',
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

export default sessions;

