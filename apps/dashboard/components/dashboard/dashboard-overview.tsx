/**
 * DashboardOverview Client Component
 *
 * Manages period state and renders KPI cards + charts.
 *
 * Per Frontend Architecture Spec §6.3:
 * - Client component for interactivity (period selection)
 * - Uses Zustand/URL state for filter persistence
 *
 * MVP Features per PRD §5.1:
 * - 4 KPI metric cards: DAU, Sessions, Success Rate, Cost
 * - Period selector: 1d, 7d, 30d, 90d
 */

'use client';

import { useState } from 'react';
import { MetricGrid } from './metric-grid';
import { ActivityChart } from './activity-chart';
import { PeriodSelector } from '@/components/filters';
import type { PeriodOption } from '@/lib/hooks';
import type { MetricsOverviewResponse } from '@/types/api';

interface DashboardOverviewProps {
	/**
	 * Initial metrics data from server-side fetch
	 */
	initialMetrics?: MetricsOverviewResponse | null;

	/**
	 * Default period (can be set via URL params)
	 * @default '7d'
	 */
	defaultPeriod?: PeriodOption;
}

export function DashboardOverview({
	initialMetrics,
	defaultPeriod = '7d',
}: DashboardOverviewProps) {
	// Period state - MVP uses local state, Phase 2+ can use URL params or Zustand
	const [period, setPeriod] = useState<PeriodOption>(defaultPeriod);

	return (
		<div className='space-y-6'>
			{/* Page header with period selector */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold text-gray-900'>
						Dashboard Overview
					</h1>
					<p className='mt-1 text-sm text-gray-500'>
						Monitor your AI agent performance and metrics
					</p>
				</div>

				{/* Period selector per PRD §5.3 - preset periods only for MVP */}
				<PeriodSelector value={period} onChange={setPeriod} />
			</div>

			{/* KPI Metric Cards - 4 cards per PRD §5.1 */}
			<MetricGrid
				period={period}
				initialData={period === defaultPeriod ? initialMetrics : undefined}
			/>

			{/* Charts section per PRD §5.2 */}
			<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				{/* Sessions over time - Line chart per PRD */}
				<ActivityChart title='Sessions Over Time' type='sessions' />

				{/* Errors by type - Bar chart per PRD */}
				<ActivityChart title='Errors by Type' type='errors' />
			</div>
		</div>
	);
}
