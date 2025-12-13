/**
 * Sessions Data Hook
 *
 * Manages session list data with filtering and client-side operations.
 * Per Frontend Architecture Spec §8.2 - Data Fetching Strategy
 */

import { useMemo, useState } from 'react';
import type { Session, SessionStatus } from '@/types/api';
import type { PeriodOption } from './useOverviewMetrics';

// Mock data for MVP - will be replaced with real API call
const MOCK_SESSIONS: Session[] = [
	{
		session_id: 'sess_01HGX5VBJX2Q8JYXMVQZRK1234',
		user_id: 'user_dev_alice',
		user: {
			name: 'Alice Chen',
			email: 'alice@example.com',
		},
		agent_id: 'agent_claude_code',
		environment: 'production',
		status: 'completed',
		started_at: '2025-12-09T10:30:00.000Z',
		ended_at: '2025-12-09T11:15:00.000Z',
		duration_seconds: 2700,
		metrics: {
			tasks_completed: 15,
			tasks_failed: 2,
			tokens_used: 45000,
			estimated_cost: 1.45,
		},
	},
	{
		session_id: 'sess_01HGX5VBKX3Q9JYXMVQZRK5678',
		user_id: 'user_dev_bob',
		user: {
			name: 'Bob Smith',
			email: 'bob@example.com',
		},
		agent_id: 'agent_claude_code',
		environment: 'staging',
		status: 'active',
		started_at: '2025-12-09T14:20:00.000Z',
		ended_at: null,
		duration_seconds: null,
		metrics: {
			tasks_completed: 8,
			tasks_failed: 0,
			tokens_used: 12000,
			estimated_cost: 0.25,
		},
	},
	{
		session_id: 'sess_01HGX5VCLX4Q0JYXMVQZRK9012',
		user_id: 'user_dev_alice',
		user: {
			name: 'Alice Chen',
			email: 'alice@example.com',
		},
		agent_id: 'agent_claude_chat',
		environment: 'production',
		status: 'error',
		started_at: '2025-12-09T09:15:00.000Z',
		ended_at: '2025-12-09T09:45:00.000Z',
		duration_seconds: 1800,
		metrics: {
			tasks_completed: 3,
			tasks_failed: 5,
			tokens_used: 8500,
			estimated_cost: 0.18,
		},
	},
];

export interface SessionFilters {
	period: PeriodOption;
	statuses: SessionStatus[];
	searchQuery: string;
}

export function useSessions() {
	const [filters, setFilters] = useState<SessionFilters>({
		period: '7d',
		statuses: [],
		searchQuery: '',
	});

	// Client-side filtering for MVP
	const filteredSessions = useMemo(() => {
		return MOCK_SESSIONS.filter((session) => {
			// Status filter
			if (filters.statuses.length > 0 && !filters.statuses.includes(session.status)) {
				return false;
			}

			// Search filter (by session ID, agent ID, or user name/email)
			if (filters.searchQuery) {
				const query = filters.searchQuery.toLowerCase();
				const matchesId = session.session_id.toLowerCase().includes(query);
				const matchesAgent = session.agent_id.toLowerCase().includes(query);
				const matchesUserName = session.user.name.toLowerCase().includes(query);
				const matchesUserEmail = session.user.email.toLowerCase().includes(query);

				if (!matchesId && !matchesAgent && !matchesUserName && !matchesUserEmail) {
					return false;
				}
			}

			return true;
		});
	}, [filters]);

	const updateFilters = (newFilters: Partial<SessionFilters>) => {
		setFilters((prev) => ({ ...prev, ...newFilters }));
	};

	return {
		sessions: filteredSessions,
		filters,
		updateFilters,
		isLoading: false, // Mock data, no loading
		error: null,
	};
}
