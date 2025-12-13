'use client';

import { MetricCard } from './metric-card';
import { MetricGridSkeleton } from './metric-grid-skeleton';
import { useOverviewMetrics, type PeriodOption } from '@/lib/hooks';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Users, Activity, CheckCircle, DollarSign } from 'lucide-react';
import type { MetricsOverviewResponse } from '@/types/api';

interface MetricGridProps {
	/**
	 * Time period for metrics (1d | 7d | 30d | 90d)
	 * @default '7d'
	 */
	period?: PeriodOption;

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
export function MetricGrid({ period = '7d', initialData }: MetricGridProps) {
	// Use custom hook for data fetching per Frontend Architecture spec §8.2
	const { data, isLoading, error, isFetching } = useOverviewMetrics({
		period,
		compare: true,
		// Only use initial data if period matches
		initialData: initialData ?? undefined,
	});

	if (isLoading && !data) {
		return <MetricGridSkeleton />;
	}

	if (error && !data) {
		return (
			<div className='rounded-lg border border-red-200 bg-red-50 p-4'>
				<p className='text-sm text-red-700'>Failed to load metrics</p>
			</div>
		);
	}

	const metrics = data?.metrics;

	return (
		<div className='relative'>
			{/* Show subtle loading indicator when refetching */}
			{isFetching && data && (
				<div className='absolute -top-1 right-0 text-xs text-gray-400'>
					Updating...
				</div>
			)}

			<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
				{/* KPI 1: Active Users (DAU) - PRD §3.1 */}
				<div data-testid='metric-card-active-users'>
					<MetricCard
						title='Active Users'
						value={metrics?.active_users?.value ?? 0}
						change={metrics?.active_users?.change_percent ?? undefined}
						trend={metrics?.active_users?.trend ?? undefined}
						icon={<Users className='h-5 w-5' />}
					/>
				</div>

				{/* KPI 2: Total Sessions - PRD §3.1 */}
				<div data-testid='metric-card-total-sessions'>
					<MetricCard
						title='Total Sessions'
						value={metrics?.total_sessions?.value ?? 0}
						change={metrics?.total_sessions?.change_percent ?? undefined}
						trend={metrics?.total_sessions?.trend ?? undefined}
						icon={<Activity className='h-5 w-5' />}
					/>
				</div>

				{/* KPI 3: Success Rate - PRD §3.2 */}
				<div data-testid='metric-card-success-rate'>
					<MetricCard
						title='Success Rate'
						value={formatPercent(metrics?.success_rate?.value ?? 0)}
						change={metrics?.success_rate?.change_percent ?? undefined}
						trend={metrics?.success_rate?.trend ?? undefined}
						icon={<CheckCircle className='h-5 w-5' />}
					/>
				</div>

				{/* KPI 4: Estimated Cost (MTD Spend) - PRD §3.3 */}
				<div data-testid='metric-card-estimated-cost'>
					<MetricCard
						title='Estimated Cost'
						value={formatCurrency(metrics?.total_cost?.value ?? 0)}
						change={metrics?.total_cost?.change_percent ?? undefined}
						trend={metrics?.total_cost?.trend ?? undefined}
						icon={<DollarSign className='h-5 w-5' />}
					/>
				</div>
			</div>
		</div>
	);
}
