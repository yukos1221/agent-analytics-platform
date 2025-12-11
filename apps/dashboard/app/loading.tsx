import { MetricGridSkeleton } from '@/components/dashboard/metric-grid-skeleton';
import { ActivityChartSkeleton } from '@/components/dashboard/activity-chart-skeleton';

export default function DashboardLoading() {
	return (
		<div className='flex h-screen overflow-hidden'>
			{/* Sidebar skeleton */}
			<aside className='flex w-64 flex-col border-r border-gray-200 bg-white'>
				<div className='flex h-16 items-center border-b border-gray-200 px-6'>
					<div className='h-8 w-8 skeleton rounded-lg' />
					<div className='ml-2 h-5 w-24 skeleton rounded' />
				</div>
				<nav className='flex-1 space-y-1 px-3 py-4'>
					{[...Array(6)].map((_, i) => (
						<div key={i} className='flex items-center px-3 py-2'>
							<div className='h-5 w-5 skeleton rounded' />
							<div className='ml-3 h-4 w-20 skeleton rounded' />
						</div>
					))}
				</nav>
			</aside>

			{/* Main content skeleton */}
			<div className='flex flex-1 flex-col overflow-hidden'>
				{/* Header skeleton */}
				<header className='flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6'>
					<div className='h-10 w-96 skeleton rounded-md' />
					<div className='flex items-center space-x-4'>
						<div className='h-8 w-8 skeleton rounded-full' />
						<div className='h-8 w-8 skeleton rounded-full' />
					</div>
				</header>

				{/* Page content skeleton */}
				<main className='flex-1 overflow-y-auto bg-gray-50 p-6'>
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
				</main>
			</div>
		</div>
	);
}
