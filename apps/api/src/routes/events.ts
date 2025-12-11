import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
	EventBatchRequestSchema,
	EventBatchResponse,
	EventBatchError,
	generateRequestId,
	ErrorResponse,
} from '../schemas';

const events = new Hono();

/**
 * POST /events
 * Ingest analytics events (batch)
 *
 * OpenAPI: operationId: ingestEvents
 * Auth: ApiKeyAuth (X-API-Key header)
 * Status codes: 202 (accepted), 400, 401, 422, 429, 500
 */
events.post(
	'/',
	zValidator('json', EventBatchRequestSchema, (result, c) => {
		if (!result.success) {
			const requestId = generateRequestId();
			const errors = result.error.issues.map((issue) => ({
				field: issue.path.join('.'),
				message: issue.message,
				received: String(issue.code),
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
		const body = c.req.valid('json');

		// TODO: Implement actual event ingestion
		// For now, accept all valid events
		const accepted = body.events.length;
		const rejected = 0;
		const errors: EventBatchError[] = [];

		// TODO: Check for duplicate event_ids
		// TODO: Queue events for async processing (Kinesis)

		const response: EventBatchResponse = {
			accepted,
			rejected,
			request_id: requestId,
		};

		// Only include errors array if there are rejected events
		if (errors.length > 0) {
			response.errors = errors;
		}

		// Set rate limit headers per OpenAPI spec
		c.header('X-RateLimit-Limit', '1000');
		c.header('X-RateLimit-Remaining', '999');
		c.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600));

		// Return 202 Accepted per OpenAPI spec
		return c.json(response, 202);
	}
);

export default events;
