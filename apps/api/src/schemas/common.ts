import { z } from 'zod';

/**
 * ErrorResponse schema - matches OpenAPI ErrorResponse exactly
 * Required: error, request_id
 */
export const ErrorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.record(z.unknown()).optional(),
		field: z.string().optional(),
		documentation_url: z.string().url().optional(),
	}),
	request_id: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 15);
	return `req_${timestamp}${random}`;
}
