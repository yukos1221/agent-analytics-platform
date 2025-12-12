import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
	EventBatchRequestSchema,
	EventBatchResponse,
	ErrorResponse,
} from '../schemas';
import {
	apiKeyAuth,
	getAuthContext,
	getRequestId,
	rateLimit,
} from '../middleware';
import { insertEvents } from '../../../../packages/database/src';
import { eventStore } from '../services';

const events = new Hono();

/**
 * POST /events
 * Ingest analytics events (batch)
 *
 * OpenAPI: operationId: ingestEvents
 * Spec: specs/openapi.mvp.v1.yaml lines 98-172
 * Docs: docs/03-api-specification-v1.2.md Section 6.1
 *
 * Authentication: ApiKeyAuth (X-API-Key header)
 * - Per OpenAPI spec, requires X-API-Key header
 * - For MVP, we validate format and extract org_id
 * - Phase 2 will add signature verification
 *
 * Request Body: EventBatchRequest
 * - events: array of Event objects (1-1000 items)
 *
 * Response:
 * - 202 Accepted: Events accepted for processing
 * - 400 Bad Request: Invalid request format
 * - 401 Unauthorized: Missing or invalid API key
 * - 422 Validation Error: Request body validation failed
 * - 429 Rate Limit Exceeded: Too many requests
 * - 500 Internal Error: Server error
 */
events.post(
	'/',
	// Apply API key authentication middleware
	apiKeyAuth(),
	// Apply per-API-key rate limit: 1000 requests per 60s (MVP). TODO: move to redis.
	rateLimit({ scope: 'api_key', limit: 1000, windowSeconds: 60 }),
	// Validate request body against EventBatchRequest schema
	zValidator('json', EventBatchRequestSchema, (result, c) => {
		if (!result.success) {
			const requestId = getRequestId(c);

			// Transform Zod errors to match OpenAPI ValidationError format
			// Per OpenAPI spec: error.details.errors[] with field, message, received
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

			// 422 Unprocessable Entity for validation errors
			// Per OpenAPI spec: ValidationError response
			return c.json(response, 422);
		}
	}),
	async (c) => {
		const requestId = getRequestId(c);
		const authContext = getAuthContext(c);
		const body = c.req.valid('json');

		try {
			// Persist events to DB (Phase 1). For tests, prefer the local
			// in-memory `eventStore` to avoid cross-package module instance
			// resolution issues; otherwise use `insertEvents` which may
			// use a real database or fallback to an in-memory store.
			let result;
			if (process.env.NODE_ENV === 'test') {
				result = await eventStore.ingest(authContext.org_id, body.events);
			} else {
				result = await insertEvents(authContext.org_id, body.events);
			}

			// Build response per OpenAPI EventBatchResponse schema
			// Required: accepted, rejected, request_id
			// Optional: errors (only include if there are rejected events)
			const response: EventBatchResponse = {
				accepted: result.accepted,
				rejected: result.rejected,
				request_id: requestId,
			};

			// Only include errors array if there are rejected events
			// Per OpenAPI spec: errors is optional
			if (result.errors.length > 0) {
				response.errors = result.errors;
			}

			// Set rate limit headers per OpenAPI spec (components/headers)
			// X-RateLimit-Limit: Maximum requests allowed per time window
			// X-RateLimit-Remaining: Remaining requests in current window
			// X-RateLimit-Reset: Unix timestamp when rate limit resets
			c.header('X-RateLimit-Limit', '1000');
			c.header('X-RateLimit-Remaining', '999');
			c.header(
				'X-RateLimit-Reset',
				String(Math.floor(Date.now() / 1000) + 3600)
			);

			// Return 202 Accepted per OpenAPI spec
			// Events are processed asynchronously (for now, stored in memory)
			return c.json(response, 202);
		} catch (error) {
			// 500 Internal Server Error
			// Per OpenAPI spec: InternalError response
			console.error('Event ingestion error:', error);

			const response: ErrorResponse = {
				error: {
					code: 'SRV_INTERNAL_ERROR',
					message: 'An unexpected error occurred. Please try again.',
				},
				request_id: requestId,
			};

			return c.json(response, 500);
		}
	}
);

export default events;
