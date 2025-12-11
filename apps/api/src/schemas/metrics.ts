import { z } from 'zod';

/**
 * Period query parameter - matches OpenAPI enum
 */
export const PeriodQuerySchema = z
	.enum(['1d', '7d', '30d', '90d'])
	.default('7d');

export type PeriodQuery = z.infer<typeof PeriodQuerySchema>;

/**
 * Compare query parameter
 */
export const CompareQuerySchema = z
	.string()
	.transform((val) => val === 'true')
	.default('true');

/**
 * Metrics overview query parameters
 */
export const MetricsOverviewQuerySchema = z.object({
	period: PeriodQuerySchema,
	compare: CompareQuerySchema,
});

export type MetricsOverviewQuery = z.infer<typeof MetricsOverviewQuerySchema>;

/**
 * Trend direction - matches OpenAPI enum
 */
export const TrendSchema = z.enum(['up', 'down', 'stable']);

export type Trend = z.infer<typeof TrendSchema>;

/**
 * MetricValue schema - matches OpenAPI MetricValue exactly
 * Required: value
 * Optional: previous, change_percent, trend, unit
 */
export const MetricValueSchema = z.object({
	value: z.number(),
	previous: z.number().nullable().optional(),
	change_percent: z.number().nullable().optional(),
	trend: TrendSchema.nullable().optional(),
	unit: z.string().optional(),
});

export type MetricValue = z.infer<typeof MetricValueSchema>;

/**
 * Granularity enum - matches OpenAPI enum
 */
export const GranularitySchema = z.enum(['hour', 'day', 'week']);

export type Granularity = z.infer<typeof GranularitySchema>;

/**
 * Period schema - matches OpenAPI Period exactly
 * Required: start, end
 * Optional: granularity
 */
export const PeriodSchema = z.object({
	start: z.string().datetime(),
	end: z.string().datetime(),
	granularity: GranularitySchema.optional(),
});

export type Period = z.infer<typeof PeriodSchema>;

/**
 * Metrics object - matches OpenAPI MetricsOverviewResponse.metrics exactly
 * Required: active_users, total_sessions, success_rate, total_cost
 * Optional: avg_session_duration, error_count
 */
export const MetricsSchema = z.object({
	active_users: MetricValueSchema,
	total_sessions: MetricValueSchema,
	success_rate: MetricValueSchema,
	avg_session_duration: MetricValueSchema.optional(),
	total_cost: MetricValueSchema,
	error_count: MetricValueSchema.optional(),
});

export type Metrics = z.infer<typeof MetricsSchema>;

/**
 * Meta object - matches OpenAPI MetricsOverviewResponse.meta
 */
export const MetaSchema = z.object({
	cache_hit: z.boolean().optional(),
	cache_ttl: z.number().int().optional(),
	request_id: z.string().optional(),
});

export type Meta = z.infer<typeof MetaSchema>;

/**
 * MetricsOverviewResponse schema - matches OpenAPI exactly
 * Required: period, metrics
 * Optional: meta
 */
export const MetricsOverviewResponseSchema = z.object({
	period: PeriodSchema,
	metrics: MetricsSchema,
	meta: MetaSchema.optional(),
});

export type MetricsOverviewResponse = z.infer<
	typeof MetricsOverviewResponseSchema
>;
