import { z } from 'zod';

/**
 * Event types - matches OpenAPI enum exactly
 */
export const EventTypeSchema = z.enum([
	'session_start',
	'session_end',
	'session_pause',
	'session_resume',
	'task_start',
	'task_complete',
	'task_error',
	'task_cancel',
	'tool_call',
	'tool_response',
	'error',
	'warning',
	'feedback_positive',
	'feedback_negative',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * Environment enum - matches OpenAPI enum
 */
export const EnvironmentSchema = z.enum([
	'production',
	'staging',
	'development',
]);

export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Event schema - matches OpenAPI Event schema exactly
 * Required: event_id, event_type, timestamp, session_id, user_id, agent_id
 * Optional: environment (default: production), metadata
 */
export const EventSchema = z.object({
	event_id: z
		.string()
		.regex(
			/^evt_[a-zA-Z0-9]{20,30}$/,
			'event_id must match pattern ^evt_[a-zA-Z0-9]{20,30}$'
		),
	event_type: EventTypeSchema,
	timestamp: z
		.string()
		.datetime({ message: 'timestamp must be valid ISO 8601 datetime' }),
	session_id: z
		.string()
		.regex(
			/^sess_[a-zA-Z0-9]{20,30}$/,
			'session_id must match pattern ^sess_[a-zA-Z0-9]{20,30}$'
		),
	user_id: z.string().max(128, 'user_id must be at most 128 characters'),
	agent_id: z.string().max(64, 'agent_id must be at most 64 characters'),
	environment: EnvironmentSchema.default('production'),
	metadata: z.record(z.unknown()).optional(),
});

export type Event = z.infer<typeof EventSchema>;

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
 * EventBatchError schema - for rejected events
 */
export const EventBatchErrorSchema = z.object({
	index: z.number().int(),
	event_id: z.string().optional(),
	code: z.string(),
	message: z.string(),
});

export type EventBatchError = z.infer<typeof EventBatchErrorSchema>;

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
