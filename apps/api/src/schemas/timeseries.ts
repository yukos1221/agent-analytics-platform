import { z } from 'zod';
import { PeriodSchema, GranularitySchema } from './metrics';

/**
 * Timeseries Metric - matches OpenAPI enum
 */
export const TimeseriesMetricSchema = z.enum([
	'active_users',
	'total_sessions',
	'session_duration',
	'success_rate',
	'error_rate',
	'tokens_used',
	'cost',
]);

export type TimeseriesMetric = z.infer<typeof TimeseriesMetricSchema>;

/**
 * Timeseries Query Parameters
 * Note: metric is required, period defaults to 7d, granularity is optional
 */
export const TimeseriesQuerySchema = z.object({
	metric: TimeseriesMetricSchema, // Required per OpenAPI spec
	period: z.enum(['1d', '7d', '30d', '90d']).optional().default('7d'),
	granularity: GranularitySchema.optional(),
});

export type TimeseriesQuery = z.infer<typeof TimeseriesQuerySchema>;

/**
 * Timeseries Point - matches OpenAPI TimeseriesPoint
 */
export const TimeseriesPointSchema = z.object({
	timestamp: z.string().datetime(),
	value: z.number(),
});

export type TimeseriesPoint = z.infer<typeof TimeseriesPointSchema>;

/**
 * Aggregations - matches OpenAPI aggregations (optional)
 */
export const AggregationsSchema = z.object({
	min: z.number(),
	max: z.number(),
	avg: z.number(),
	sum: z.number(),
	p50: z.number().optional(),
	p95: z.number().optional(),
});

export type Aggregations = z.infer<typeof AggregationsSchema>;

/**
 * Metrics Timeseries Response - matches OpenAPI MetricsTimeseriesResponse
 */
export const MetricsTimeseriesResponseSchema = z.object({
	metric: TimeseriesMetricSchema,
	period: PeriodSchema,
	granularity: GranularitySchema,
	data: z.array(TimeseriesPointSchema),
	aggregations: AggregationsSchema.optional(),
	meta: z
		.object({
			request_id: z.string().optional(),
			query_time_ms: z.number().int().optional(),
		})
		.optional(),
});

export type MetricsTimeseriesResponse = z.infer<
	typeof MetricsTimeseriesResponseSchema
>;

