/**
 * Sessions Data Hook
 *
 * Manages session list data with filtering using React Query.
 * Per Frontend Architecture Spec §8.2 - Data Fetching Strategy
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
	getSessions,
	getSessionDetail,
	sessionKeys,
} from '@/lib/api/sessions';
import type { PeriodOption } from '@/lib/api/metrics';
import type { SessionsListResponse, SessionStatus } from '@/types/api';

export interface SessionFilters {
	period: PeriodOption;
	statuses: SessionStatus[];
	searchQuery: string;
}

interface UseSessionsOptions {
	/**
	 * Time period for filtering sessions
	 * @default '7d'
	 */
	period?: PeriodOption;

	/**
	 * Status filters
	 * @default []
	 */
	statuses?: SessionStatus[];

	/**
	 * Initial data from server-side fetch (for SSR hydration)
	 */
	initialData?: SessionsListResponse;

	/**
	 * Whether the query is enabled
	 * @default true
	 */
	enabled?: boolean;
}

/**
 * Hook to fetch and manage sessions list with filtering
 *
 * For MVP: Basic filtering via API (advanced filtering TODO for Phase 2)
 * Uses GET /v1/sessions API endpoint with start_time/end_time parameters
 */
export function useSessions(options: UseSessionsOptions = {}) {
	const {
		period = '7d',
		statuses = [],
		initialData,
		enabled = true,
	} = options;

	const filters: SessionFilters = {
		period,
		statuses,
		searchQuery: '', // TODO: Phase 2 - Add search query filtering
	};

	const query = useQuery({
		queryKey: sessionKeys.list({
			period: filters.period,
			status: filters.statuses,
			// TODO: Phase 2 - Add search query to query key
		}),
		queryFn: () => getSessions({
			period: filters.period,
			status: filters.statuses.length > 0 ? filters.statuses : undefined,
		}),
		initialData,
		enabled,
		staleTime: 30 * 1000, // Sessions data can be stale for 30s
		refetchInterval: false, // Don't auto-refetch unless filters change
	});

	// TODO: Phase 2 - Implement client-side search filtering
	const sessions = query.data?.data || [];

	const updateFilters = (newFilters: Partial<SessionFilters>) => {
		// TODO: Phase 2 - Implement filter updates with proper query invalidation
		console.warn('Filter updates not implemented yet - Phase 2 feature');
	};

	return {
		sessions,
		filters,
		updateFilters,
		isLoading: query.isLoading,
		error: query.error,
		hasMore: query.data?.pagination.has_more ?? false,
		cursor: query.data?.pagination.cursor,
	};
}

/**
 * Hook to fetch a single session detail
 * GET /v1/sessions/{sessionId}
 */
export function useSession(sessionId: string) {
	return useQuery({
		queryKey: sessionKeys.detail(sessionId),
		queryFn: () => getSessionDetail({ sessionId }),
		enabled: !!sessionId,
		staleTime: 60 * 1000, // Session details don't change often
	});
}

/**
 * Prefetch sessions for server-side rendering
 */
export async function prefetchSessions(
	queryClient: ReturnType<typeof useQueryClient>,
	period: PeriodOption = '7d'
): Promise<void> {
	await queryClient.prefetchQuery({
		queryKey: sessionKeys.list({ period }),
		queryFn: () => getSessions({ period }),
	});
}
