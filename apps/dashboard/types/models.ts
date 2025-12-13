// Domain Models

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
