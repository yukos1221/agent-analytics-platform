import { Suspense } from 'react';
import { getMetricsOverview } from '@/lib/api/metrics';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MetricGrid } from '@/components/dashboard/metric-grid';
import { MetricGridSkeleton } from '@/components/dashboard/metric-grid-skeleton';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { ActivityChartSkeleton } from '@/components/dashboard/activity-chart-skeleton';
import type { MetricsOverviewResponse } from '@/types/api';

export const metadata = {
	title: 'Dashboard Overview | AI Agent Analytics',
	description: 'Monitor your AI agent performance and metrics',
};

// Revalidate data every 60 seconds (matches API cache TTL)
export const revalidate = 60;

/**
 * Dashboard Overview Page (Server Component)
 *
 * MVP Features per PRD:
 * - 4 KPI metric cards: DAU, Total Sessions, Success Rate, Estimated Cost
 * - Sessions over time chart (line)
 * - Errors by type chart (bar)
 *
 * Data Flow per Frontend Architecture Spec:
 * - Server-side data fetching for initial load (<2s target)
 * - Pass initialData to client components for hydration
 * - React Query handles client-side refresh
 */
async function DashboardContent() {
	// Server-side data fetching
	let initialMetrics: MetricsOverviewResponse | null = null;
	let fetchError: string | null = null;

	try {
		initialMetrics = await getMetricsOverview({ period: '7d', compare: true });
	} catch (error) {
		console.error('Failed to fetch metrics:', error);
		fetchError =
			error instanceof Error ? error.message : 'Failed to load metrics';
	}

	return (
		<div className='space-y-6'>
			{/* Page header */}
			<div>
				<h1 className='text-2xl font-semibold text-gray-900'>
					Dashboard Overview
				</h1>
				<p className='mt-1 text-sm text-gray-500'>
					Monitor your AI agent performance and metrics
				</p>
			</div>

			{/* KPI Metric Cards - 4 cards per PRD */}
			{fetchError ? (
				<div className='rounded-lg border border-error-200 bg-error-50 p-4'>
					<p className='text-sm text-error-700'>{fetchError}</p>
				</div>
			) : (
				<MetricGrid initialData={initialMetrics} />
			)}

			{/* Charts section */}
			<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				{/* Sessions over time - Line chart per PRD */}
				<Suspense
					fallback={<ActivityChartSkeleton title='Sessions Over Time' />}
				>
					<ActivityChart title='Sessions Over Time' type='sessions' />
				</Suspense>

				{/* Errors by type - Bar chart per PRD */}
				<Suspense fallback={<ActivityChartSkeleton title='Errors by Type' />}>
					<ActivityChart title='Errors by Type' type='errors' />
				</Suspense>
			</div>
		</div>
	);
}

export default function DashboardPage() {
	return (
		<div className='flex h-screen overflow-hidden'>
			{/* Sidebar navigation */}
			<Sidebar />

			{/* Main content area */}
			<div className='flex flex-1 flex-col overflow-hidden'>
				{/* Top header */}
				<Header />

				{/* Page content */}
				<main className='flex-1 overflow-y-auto bg-gray-50 p-6'>
					<Suspense fallback={<DashboardSkeleton />}>
						<DashboardContent />
					</Suspense>
				</main>
			</div>
		</div>
	);
}

function DashboardSkeleton() {
	return (
		<div className='space-y-6'>
			<div>
				<div className='h-8 w-48 skeleton rounded' />
				<div className='mt-2 h-4 w-72 skeleton rounded' />
			</div>
			<MetricGridSkeleton />
			<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				<ActivityChartSkeleton title='Sessions Over Time' />
				<ActivityChartSkeleton title='Errors by Type' />
			</div>
		</div>
	);
}
