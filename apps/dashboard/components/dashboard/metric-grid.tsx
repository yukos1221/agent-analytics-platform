'use client';

import { useQuery } from '@tanstack/react-query';
import { MetricCard } from './metric-card';
import { MetricGridSkeleton } from './metric-grid-skeleton';
import { metricsKeys, getMetricsOverview } from '@/lib/api/metrics';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Users, Activity, CheckCircle, DollarSign } from 'lucide-react';
import type { MetricsOverviewResponse } from '@/types/api';

interface MetricGridProps {
	/**
	 * Initial data from server-side fetch
	 * Used for SSR hydration per Frontend Architecture spec
	 */
	initialData?: MetricsOverviewResponse | null;
}

/**
 * MetricGrid - Displays 4 KPI cards per PRD requirements
 *
 * KPIs (from PRD §5.1 Executive Overview):
 * 1. Active Users (DAU) - Daily/Weekly active users
 * 2. Total Sessions - Count of agent sessions
 * 3. Success Rate - Completed/Total sessions
 * 4. Estimated Cost - MTD spend
 *
 * Data source: GET /v1/metrics/overview
 * Fields match API Specification v1.2 MetricsOverviewResponse
 */
export function MetricGrid({ initialData }: MetricGridProps) {
	const { data, isLoading, error } = useQuery({
		queryKey: metricsKeys.overview({ period: '7d', compare: true }),
		queryFn: () => getMetricsOverview({ period: '7d', compare: true }),
		// Use server-fetched data as initial data for instant hydration
		initialData: initialData ?? undefined,
		// Stale time matches API cache TTL (60s)
		staleTime: 60 * 1000,
	});

	if (isLoading && !initialData) {
		return <MetricGridSkeleton />;
	}

	if (error && !data) {
		return (
			<div className='rounded-lg border border-error-200 bg-error-50 p-4'>
				<p className='text-sm text-error-700'>Failed to load metrics</p>
			</div>
		);
	}

	const metrics = data?.metrics;

	return (
		<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
			{/* KPI 1: Active Users (DAU) - PRD §3.1 */}
			<MetricCard
				title='Active Users'
				value={metrics?.active_users?.value ?? 0}
				change={metrics?.active_users?.change_percent}
				trend={metrics?.active_users?.trend}
				icon={<Users className='h-5 w-5' />}
			/>

			{/* KPI 2: Total Sessions - PRD §3.1 */}
			<MetricCard
				title='Total Sessions'
				value={metrics?.total_sessions?.value ?? 0}
				change={metrics?.total_sessions?.change_percent}
				trend={metrics?.total_sessions?.trend}
				icon={<Activity className='h-5 w-5' />}
			/>

			{/* KPI 3: Success Rate - PRD §3.2 */}
			<MetricCard
				title='Success Rate'
				value={formatPercent(metrics?.success_rate?.value ?? 0)}
				change={metrics?.success_rate?.change_percent}
				trend={metrics?.success_rate?.trend}
				icon={<CheckCircle className='h-5 w-5' />}
			/>

			{/* KPI 4: Estimated Cost (MTD Spend) - PRD §3.3 */}
			<MetricCard
				title='Estimated Cost'
				value={formatCurrency(metrics?.total_cost?.value ?? 0)}
				change={metrics?.total_cost?.change_percent}
				trend={metrics?.total_cost?.trend}
				icon={<DollarSign className='h-5 w-5' />}
			/>
		</div>
	);
}
