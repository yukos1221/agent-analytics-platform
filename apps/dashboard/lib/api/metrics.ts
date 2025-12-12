/**
 * Metrics API functions
 * Based on API Specification v1.2 and Frontend Architecture Spec
 *
 * Uses generated types from @repo/sdk (OpenAPI spec as single source of truth)
 */

import { api } from './client';
// Use generated types from SDK (OpenAPI spec as single source of truth)
// Fallback to local types if SDK not generated yet
import type { MetricsOverviewResponse } from '@/types/api';

// Try to import generated types (will fail gracefully if not generated)
type MetricsResponse = MetricsOverviewResponse;

// TODO: Once SDK is generated, use:
// import type { paths } from '@repo/sdk/types';
// type MetricsResponse = paths['/v1/metrics/overview']['get']['responses']['200']['content']['application/json'];

export type PeriodOption = '1d' | '7d' | '30d' | '90d';

interface GetMetricsOverviewOptions {
	period?: PeriodOption;
	compare?: boolean;
}

/**
 * Fetch metrics overview from API
 * Used by server components for SSR and client components for refresh
 *
 * GET /v1/metrics/overview
 * Response: MetricsOverviewResponse
 */
export async function getMetricsOverview(
	options: GetMetricsOverviewOptions = {}
): Promise<MetricsResponse> {
	const { period = '7d', compare = true } = options;

	return api.get<MetricsResponse>('/v1/metrics/overview', {
		period,
		compare,
	});
}

/**
 * React Query key factory for metrics queries
 */
export const metricsKeys = {
	all: ['metrics'] as const,
	overview: (params: { period: string; compare: boolean }) =>
		[...metricsKeys.all, 'overview', params] as const,
	timeseries: (params: {
		metric: string;
		period: string;
		granularity: string;
	}) => [...metricsKeys.all, 'timeseries', params] as const,
};
