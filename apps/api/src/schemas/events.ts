import { z } from 'zod';
// Re-export Event types from shared package
export type {
	Event,
	EventType,
	Environment,
	EventBatchError,
} from '@repo/shared';
// Import schemas for use in this file
import {
	EventSchema,
	EventTypeSchema,
	EnvironmentSchema,
	EventBatchErrorSchema,
} from '@repo/shared';
// Re-export schemas
export {
	EventSchema,
	EventTypeSchema,
	EnvironmentSchema,
	EventBatchErrorSchema,
};

/**
 * EventBatchRequest schema - matches OpenAPI EventBatchRequest exactly
 * Required: events (array, 1-1000 items)
 */
export const EventBatchRequestSchema = z.object({
	events: z
		.array(EventSchema)
		.min(1, 'events must contain at least 1 item')
		.max(1000, 'events must contain at most 1000 items'),
});

export type EventBatchRequest = z.infer<typeof EventBatchRequestSchema>;

/**
 * EventBatchResponse schema - matches OpenAPI EventBatchResponse exactly
 * Required: accepted, rejected, request_id
 * Optional: errors
 */
export const EventBatchResponseSchema = z.object({
	accepted: z.number().int().min(0),
	rejected: z.number().int().min(0),
	errors: z.array(EventBatchErrorSchema).optional(),
	request_id: z.string(),
});

export type EventBatchResponse = z.infer<typeof EventBatchResponseSchema>;
