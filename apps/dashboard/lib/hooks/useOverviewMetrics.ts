/**
 * useOverviewMetrics Hook
 *
 * Custom React Query hook for fetching dashboard overview metrics.
 *
 * Spec References:
 * - API: docs/03-api-specification-v1.2.md §6.2 GET /v1/metrics/overview
 * - Frontend: docs/04-frontend-architecture-v1.1.md §8.2 Query Hooks
 * - PRD: docs/01-product-requirements.md §3 Key Metrics (P0)
 *
 * Response matches OpenAPI MetricsOverviewResponse:
 * - period: { start, end }
 * - metrics: { active_users, total_sessions, success_rate, total_cost, ... }
 * - meta: { cache_hit, cache_ttl, request_id }
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
	getMetricsOverview,
	metricsKeys,
	type PeriodOption,
} from '@/lib/api/metrics';
import type { MetricsOverviewResponse } from '@/types/api';

export type { PeriodOption } from '@/lib/api/metrics';

interface UseOverviewMetricsOptions {
	/**
	 * Time period for metrics
	 * Per API spec: 1d | 7d | 30d | 90d
	 * @default '7d'
	 */
	period?: PeriodOption;

	/**
	 * Include comparison with previous period
	 * @default true
	 */
	compare?: boolean;

	/**
	 * Initial data from server-side fetch (for SSR hydration)
	 */
	initialData?: MetricsOverviewResponse;

	/**
	 * Whether the query is enabled
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Custom React Query options
	 */
	queryOptions?: Omit<
		UseQueryOptions<MetricsOverviewResponse, Error>,
		'queryKey' | 'queryFn' | 'initialData' | 'enabled'
	>;
}

/**
 * Hook to fetch overview metrics from GET /v1/metrics/overview
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, isLoading, error } = useOverviewMetrics();
 *
 * // With period filter
 * const { data } = useOverviewMetrics({ period: '30d' });
 *
 * // With SSR initial data
 * const { data } = useOverviewMetrics({
 *   period: '7d',
 *   initialData: serverFetchedData
 * });
 * ```
 */
export function useOverviewMetrics(options: UseOverviewMetricsOptions = {}) {
	const {
		period = '7d',
		compare = true,
		initialData,
		enabled = true,
		queryOptions,
	} = options;

	return useQuery<MetricsOverviewResponse, Error>({
		// Query key per Frontend Architecture spec §8.2
		queryKey: metricsKeys.overview({ period, compare }),

		// Fetch function
		queryFn: () => getMetricsOverview({ period, compare }),

		// Initial data for SSR hydration
		initialData,

		// Enable/disable
		enabled,

		// Stale time matches API cache TTL (60s) per API spec
		staleTime: 60 * 1000,

		// Refetch every 30 seconds for dashboard freshness
		refetchInterval: 30 * 1000,

		// Continue showing stale data while refetching
		placeholderData: (previousData) => previousData,

		// Custom options
		...queryOptions,
	});
}

/**
 * Prefetch overview metrics (for server components or prefetching)
 */
export async function prefetchOverviewMetrics(
	period: PeriodOption = '7d',
	compare = true
): Promise<MetricsOverviewResponse> {
	return getMetricsOverview({ period, compare });
}
