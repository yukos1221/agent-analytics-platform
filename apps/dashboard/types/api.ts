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

// Event API Types
export type EventType =
	| 'session_start'
	| 'session_end'
	| 'session_pause'
	| 'session_resume'
	| 'task_start'
	| 'task_complete'
	| 'task_error'
	| 'task_cancel'
	| 'tool_call'
	| 'tool_response'
	| 'error'
	| 'warning'
	| 'feedback_positive'
	| 'feedback_negative';

export interface Event {
	event_id: string;
	event_type: EventType;
	timestamp: string;
	session_id: string;
	user_id: string;
	agent_id: string;
	environment?: string;
	metadata?: Record<string, unknown>;
}

export interface SessionEventsResponse {
	session_id: string;
	events: Event[];
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

// Detailed session response from GET /v1/sessions/{id}
export interface SessionAgentInfo {
	name: string;
	version: string;
}

export interface SessionClientInfo {
	ide: string;
	ide_version: string;
	os: string;
	os_version: string;
}

export interface SessionDetailMetrics {
	tasks_completed: number;
	tasks_failed: number;
	tasks_cancelled: number;
	tokens_input: number;
	tokens_output: number;
	estimated_cost: number;
	avg_task_duration_ms: number;
}

export interface SessionTimeline {
	event_count: number;
	first_event: string;
	last_event: string;
}

export interface SessionDetailResponse {
	session_id: string;
	user_id: string;
	user?: UserSummary;
	agent_id: string;
	agent?: SessionAgentInfo;
	client_info?: SessionClientInfo;
	environment: string;
	status: SessionStatus;
	started_at: string;
	ended_at: string | null;
	duration_seconds: number | null;
	metrics: SessionDetailMetrics;
	timeline?: SessionTimeline;
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
