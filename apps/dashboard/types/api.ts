// API Response Types - derived from OpenAPI spec
//
// NOTE: These types are manually maintained for now.
// In Phase 1, we're migrating to generated types from @repo/sdk.
// Once SDK is generated, prefer using types from '@repo/sdk/types'.
//
// Example:
//   import type { paths } from '@repo/sdk/types';
//   type MetricsResponse = paths['/v1/metrics/overview']['get']['responses']['200']['content']['application/json'];

export type Trend = 'up' | 'down' | 'stable';

export interface MetricValue {
	value: number;
	previous?: number | null;
	change_percent?: number | null;
	trend?: Trend | null;
	unit?: string;
}

export interface Period {
	start: string;
	end: string;
	granularity?: 'hour' | 'day' | 'week';
}

export interface MetricsOverviewResponse {
	period: Period;
	metrics: {
		active_users: MetricValue;
		total_sessions: MetricValue;
		success_rate: MetricValue;
		avg_session_duration?: MetricValue;
		total_cost: MetricValue;
		error_count?: MetricValue;
	};
	meta?: {
		cache_hit?: boolean;
		cache_ttl?: number;
		request_id?: string;
	};
}

export interface ErrorResponse {
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
		field?: string;
		documentation_url?: string;
	};
	request_id: string;
}
