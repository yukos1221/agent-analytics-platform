/**
 * Sessions API functions
 * Based on API Specification v1.2 and Frontend Architecture Spec
 */

import { api } from './client';
import type { SessionsListResponse, Session, SessionDetailResponse, SessionEventsResponse } from '@/types/api';
import type { PeriodOption } from './metrics';
import { getDateRangeForPeriod, formatDateForAPI } from '@/lib/utils/date';

interface GetSessionsOptions {
	period?: PeriodOption;
	status?: string[];
	agent_id?: string;
	user_id?: string;
	environment?: string;
	limit?: number;
	cursor?: string;
}

interface GetSessionDetailOptions {
	sessionId: string;
}

interface GetSessionEventsOptions {
	sessionId: string;
	limit?: number;
	cursor?: string;
}

/**
 * Fetch sessions list from API
 * GET /v1/sessions
 */
export async function getSessions(
	options: GetSessionsOptions = {}
): Promise<SessionsListResponse> {
	const {
		period = '7d',
		status,
		agent_id,
		user_id,
		environment,
		limit = 25,
		cursor,
	} = options;

	// Convert period to date range
	const dateRange = getDateRangeForPeriod(period);

	const params: Record<string, string | number | undefined> = {
		start_time: formatDateForAPI(dateRange.start),
		end_time: formatDateForAPI(dateRange.end),
		limit,
		cursor,
	};

	// Add optional filters
	if (status && status.length > 0) {
		params.status = status.join(',');
	}
	if (agent_id) {
		params.agent_id = agent_id;
	}
	if (user_id) {
		params.user_id = user_id;
	}
	if (environment) {
		params.environment = environment;
	}

	return api.get<SessionsListResponse>('/v1/sessions', params);
}

/**
 * Fetch single session detail from API
 * GET /v1/sessions/{sessionId}
 */
export async function getSessionDetail(
	options: GetSessionDetailOptions
): Promise<SessionDetailResponse> {
	const { sessionId } = options;
	return api.get<SessionDetailResponse>(`/v1/sessions/${sessionId}`);
}

/**
 * Fetch session events from API
 * GET /v1/sessions/{sessionId}/events
 */
export async function getSessionEvents(
	options: GetSessionEventsOptions
): Promise<SessionEventsResponse> {
	const { sessionId, limit = 100, cursor } = options;

	const params: Record<string, string | number | undefined> = {
		limit,
		cursor,
	};

	return api.get<SessionEventsResponse>(`/v1/sessions/${sessionId}/events`, params);
}

/**
 * React Query key factory for sessions queries
 */
export const sessionKeys = {
	all: ['sessions'] as const,
	lists: () => [...sessionKeys.all, 'list'] as const,
	list: (params: Record<string, unknown>) =>
		[...sessionKeys.lists(), params] as const,
	details: () => [...sessionKeys.all, 'detail'] as const,
	detail: (id: string) => [...sessionKeys.details(), id] as const,
	events: (id: string) => [...sessionKeys.detail(id), 'events'] as const,
};
