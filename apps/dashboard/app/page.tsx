import { Suspense } from 'react';
import { getMetricsOverview } from '@/lib/api/metrics';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import {
	DashboardOverview,
	MetricGridSkeleton,
	ActivityChartSkeleton,
} from '@/components/dashboard';
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
 * MVP Features per PRD §2.3 and §5.1:
 * - 4 KPI metric cards: DAU, Total Sessions, Success Rate, Estimated Cost
 * - Period selector: Last 24h, 7d, 30d, 90d (preset only for MVP)
 * - Sessions over time chart (line)
 * - Errors by type chart (bar)
 *
 * Data Flow per Frontend Architecture Spec §4.3:
 * - Server-side data fetching for initial load (<2s target)
 * - Pass initialData to client components for hydration
 * - React Query handles client-side refresh
 *
 * User Personas Served (PRD §2):
 * - Engineering Manager: Team metrics, adoption trends
 * - Lead Developer: Session performance, success rates
 * - DevOps: Infrastructure costs, error monitoring
 * - CTO: Executive overview, spending
 */
async function DashboardContent() {
	// Server-side data fetching for initial load (7d default)
	let initialMetrics: MetricsOverviewResponse | null = null;

	try {
		initialMetrics = await getMetricsOverview({ period: '7d', compare: true });
	} catch (error) {
		// Log error but continue - client will refetch
		console.error('Server-side metrics fetch failed:', error);
	}

	return (
		<DashboardOverview initialMetrics={initialMetrics} defaultPeriod='7d' />
	);
}

export default function DashboardPage() {
	return (
		<div className='flex h-screen overflow-hidden'>
			{/* Sidebar navigation per Frontend Spec §5.1 */}
			<Sidebar />

			{/* Main content area - adjust left margin on desktop to account for sidebar */}
			<div className='flex flex-1 flex-col overflow-hidden lg:ml-0'>
				{/* Top header */}
				<Header />

				{/* Page content - adjust padding for mobile */}
				<main className='flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6'>
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
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<div className='h-8 w-48 animate-pulse rounded bg-gray-200' />
					<div className='mt-2 h-4 w-72 animate-pulse rounded bg-gray-200' />
				</div>
				<div className='h-10 w-40 animate-pulse rounded bg-gray-200' />
			</div>
			<MetricGridSkeleton />
			<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				<ActivityChartSkeleton title='Sessions Over Time' />
				<ActivityChartSkeleton title='Errors by Type' />
			</div>
		</div>
	);
}
