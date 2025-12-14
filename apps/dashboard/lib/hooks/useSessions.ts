/**
 * Sessions Data Hook
 *
 * Manages session list data with filtering using React Query.
 * Per Frontend Architecture Spec §8.2 - Data Fetching Strategy
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getSessions, getSessionDetail, getSessionEvents, sessionKeys } from '@/lib/api/sessions';
import type { PeriodOption } from '@/lib/api/metrics';
import type {
    SessionsListResponse,
    SessionDetailResponse,
    SessionEventsResponse,
    SessionStatus,
} from '@/types/api';

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
    const { period = '7d', statuses = [], initialData, enabled = true } = options;

    // Create stable query key from options
    const queryKey = sessionKeys.list({
        period,
        status: statuses,
    });

    const query = useQuery({
        queryKey,
        queryFn: () =>
            getSessions({
                period,
                status: statuses.length > 0 ? statuses : undefined,
            }),
        initialData,
        enabled,
        staleTime: 30 * 1000, // Sessions data can be stale for 30s
        refetchInterval: false, // Don't auto-refetch unless filters change
    });

    const sessions = query.data?.data || [];

    const filters: SessionFilters = {
        period,
        statuses,
        searchQuery: '', // TODO: Phase 2 - Add search query filtering
    };

    const updateFilters = (newFilters: Partial<SessionFilters>) => {
        // This is a no-op for now since filters are passed from parent component
        // In a real implementation, this would update URL params or local state
        // For now, the parent component manages filter state
        // TODO: Implement filter updates when needed
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
 * Hook to fetch session events (for timeline/replay)
 * GET /v1/sessions/{sessionId}/events
 */
export function useSessionEvents(sessionId: string, enabled: boolean = true) {
    return useInfiniteQuery({
        queryKey: sessionKeys.events(sessionId),
        queryFn: ({ pageParam }) =>
            getSessionEvents({
                sessionId,
                cursor: pageParam,
                limit: 100,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) =>
            lastPage.pagination.has_more ? lastPage.pagination.cursor : undefined,
        enabled: !!sessionId && enabled,
        staleTime: 5 * 60 * 1000, // Session events don't change once session is complete
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
