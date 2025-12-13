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

// Session API Types
export type SessionStatus = 'active' | 'completed' | 'error';

export interface UserSummary {
	name: string;
	email: string;
	avatar_url?: string;
}

export interface SessionMetrics {
	tasks_completed: number;
	tasks_failed: number;
	tokens_used: number;
	estimated_cost: number;
}

export interface Session {
	session_id: string;
	user_id: string;
	user: UserSummary;
	agent_id: string;
	environment: string;
	status: SessionStatus;
	started_at: string;
	ended_at: string | null;
	duration_seconds: number | null;
	metrics: SessionMetrics;
}

export interface SessionsListResponse {
	data: Session[];
	pagination: {
		cursor: string | null;
		has_more: boolean;
		total_estimate?: number;
	};
	meta?: {
		cache_hit?: boolean;
		request_id?: string;
		query_time_ms?: number;
	};
}
