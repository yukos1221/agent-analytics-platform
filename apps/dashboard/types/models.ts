// Domain Models

export type SessionStatus =
	| 'active'
	| 'completed'
	| 'failed'
	| 'timeout'
	| 'cancelled';

export interface Session {
	id: string;
	user_id: string;
	agent_id: string;
	status: SessionStatus;
	started_at: string;
	ended_at?: string;
	duration_seconds?: number;
	event_count: number;
	error_count: number;
	environment: 'production' | 'staging' | 'development';
}

export interface User {
	id: string;
	email: string;
	name: string;
	role: 'admin' | 'member' | 'viewer';
	organization_id: string;
}

export interface Organization {
	id: string;
	name: string;
	plan: 'free' | 'pro' | 'enterprise';
	session_limit: number;
	session_count: number;
}
