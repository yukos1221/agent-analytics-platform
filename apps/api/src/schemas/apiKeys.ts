import { z } from 'zod';

/**
 * API Key schemas matching OpenAPI spec (specs/openapi.mvp.v1.yaml)
 */

/**
 * Create API Key Request Schema
 * Per OpenAPI: CreateApiKeyRequest
 */
export const CreateApiKeyRequestSchema = z.object({
	name: z.string().min(1).max(100),
	scopes: z
		.array(z.enum(['events:write', 'analytics:read']))
		.min(1)
		.default(['events:write']),
	environment: z
		.enum(['production', 'staging', 'development'])
		.default('production')
		.optional(),
	expires_at: z.string().datetime().nullable().optional(),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;

/**
 * API Key Response Schema (for list endpoint)
 * Per OpenAPI: ApiKey
 */
export const ApiKeySchema = z.object({
	id: z.string(),
	name: z.string(),
	prefix: z.string(),
	scopes: z.array(z.enum(['events:write', 'analytics:read'])),
	environment: z.enum(['production', 'staging', 'development']),
	last_used_at: z.string().datetime().nullable().optional(),
	created_at: z.string().datetime(),
	expires_at: z.string().datetime().nullable().optional(),
	created_by: z
		.object({
			id: z.string(),
			name: z.string().optional(),
		})
		.optional(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

/**
 * API Key List Response Schema
 * Per OpenAPI: ApiKeyListResponse
 */
export const ApiKeyListResponseSchema = z.object({
	data: z.array(ApiKeySchema),
});

export type ApiKeyListResponse = z.infer<typeof ApiKeyListResponseSchema>;

/**
 * Create API Key Response Schema
 * Per OpenAPI: CreateApiKeyResponse
 */
export const CreateApiKeyResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	key: z.string(),
	secret: z.string(),
	scopes: z.array(z.enum(['events:write', 'analytics:read'])),
	environment: z.enum(['production', 'staging', 'development']),
	expires_at: z.string().datetime().nullable().optional(),
	created_at: z.string().datetime(),
	_warning: z.string().optional(),
});

export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;


