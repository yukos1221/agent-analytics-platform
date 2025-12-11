/**
 * Metrics API functions
 * Based on API Specification v1.2 and Frontend Architecture Spec
 */

import { api } from './client';
import type { MetricsOverviewResponse } from '@/types/api';

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
): Promise<MetricsOverviewResponse> {
	const { period = '7d', compare = true } = options;

	return api.get<MetricsOverviewResponse>('/v1/metrics/overview', {
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
