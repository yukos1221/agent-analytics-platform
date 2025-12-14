import { z } from 'zod';

/**
 * Session Status - matches OpenAPI enum
 */
export const SessionStatusSchema = z.enum(['active', 'completed', 'error']);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Session List Query Parameters
 */
export const SessionListQuerySchema = z.object({
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    status: z
        .union([
            z
                .string()
                .refine(
                    (val) => {
                        const parts = val.split(',').filter((s) => s.length > 0);
                        return parts.every((part) => SessionStatusSchema.safeParse(part).success);
                    },
                    {
                        message: 'Invalid status value',
                    }
                )
                .transform((val) => {
                    const parts = val.split(',').filter((s) => s.length > 0);
                    const validStatuses: SessionStatus[] = [];
                    for (const part of parts) {
                        const result = SessionStatusSchema.safeParse(part);
                        if (result.success) {
                            validStatuses.push(result.data);
                        }
                    }
                    return validStatuses.length > 0 ? validStatuses : undefined;
                }),
            z.array(SessionStatusSchema),
        ])
        .optional(),
    agent_id: z.string().optional(),
    user_id: z.string().optional(),
    sort: z.enum(['started_at', '-started_at', 'duration', '-duration']).default('-started_at'),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().optional(),
});

export type SessionListQuery = z.infer<typeof SessionListQuerySchema>;

/**
 * User info (optional in SessionSummary)
 */
export const UserInfoSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    avatar_url: z.string().url().optional(),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

/**
 * Session Metrics Summary
 */
export const SessionMetricsSummarySchema = z.object({
    tasks_completed: z.number().int().default(0),
    tasks_failed: z.number().int().default(0),
    tokens_used: z.number().int().default(0),
    estimated_cost: z.number().default(0),
});

export type SessionMetricsSummary = z.infer<typeof SessionMetricsSummarySchema>;

/**
 * Session Summary - matches OpenAPI SessionSummary
 */
export const SessionSummarySchema = z.object({
    session_id: z.string(),
    user_id: z.string(),
    user: UserInfoSchema.optional(),
    agent_id: z.string(),
    environment: z.enum(['production', 'staging', 'development']).optional(),
    status: SessionStatusSchema,
    started_at: z.string().datetime(),
    ended_at: z.string().datetime().nullable().optional(),
    duration_seconds: z.number().int().nullable().optional(),
    metrics: SessionMetricsSummarySchema.optional(),
});

export type SessionSummary = z.infer<typeof SessionSummarySchema>;

/**
 * Pagination schema - matches OpenAPI Pagination
 */
export const PaginationSchema = z.object({
    cursor: z.string().nullable().optional(),
    has_more: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Session List Response - matches OpenAPI SessionListResponse
 */
export const SessionListResponseSchema = z.object({
    data: z.array(SessionSummarySchema),
    pagination: PaginationSchema,
    meta: z
        .object({
            request_id: z.string().optional(),
        })
        .optional(),
});

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

/**
 * Detailed Session Metrics - matches OpenAPI SessionDetailResponse.metrics
 */
export const SessionDetailMetricsSchema = z.object({
    tasks_completed: z.number().int().default(0),
    tasks_failed: z.number().int().default(0),
    tasks_cancelled: z.number().int().default(0),
    tokens_input: z.number().int().default(0),
    tokens_output: z.number().int().default(0),
    estimated_cost: z.number().default(0),
    avg_task_duration_ms: z.number().int().optional(),
});

export type SessionDetailMetrics = z.infer<typeof SessionDetailMetricsSchema>;

/**
 * Agent info (optional in SessionDetailResponse)
 */
export const AgentInfoSchema = z.object({
    name: z.string().optional(),
    version: z.string().optional(),
});

export type AgentInfo = z.infer<typeof AgentInfoSchema>;

/**
 * Client info (optional in SessionDetailResponse)
 */
export const ClientInfoSchema = z.object({
    ide: z.string().optional(),
    ide_version: z.string().optional(),
    os: z.string().optional(),
    os_version: z.string().optional(),
});

export type ClientInfo = z.infer<typeof ClientInfoSchema>;

/**
 * Timeline metadata (optional in SessionDetailResponse)
 */
export const TimelineSchema = z.object({
    event_count: z.number().int().default(0),
    first_event: z.string().datetime().optional(),
    last_event: z.string().datetime().optional(),
});

export type Timeline = z.infer<typeof TimelineSchema>;

/**
 * Session Detail Response - matches OpenAPI SessionDetailResponse
 * Extends SessionSummary with additional detail fields
 */
export const SessionDetailResponseSchema = SessionSummarySchema.extend({
    agent: AgentInfoSchema.optional(),
    client_info: ClientInfoSchema.optional(),
    metrics: SessionDetailMetricsSchema.optional(),
    timeline: TimelineSchema.optional(),
});

export type SessionDetailResponse = z.infer<typeof SessionDetailResponseSchema>;
