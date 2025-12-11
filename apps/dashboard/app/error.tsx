'use client';

import { useEffect } from 'react';

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error('Dashboard error:', error);
	}, [error]);

	return (
		<div className='flex min-h-screen items-center justify-center bg-gray-50'>
			<div className='text-center'>
				<h2 className='text-xl font-semibold text-gray-900'>
					Something went wrong
				</h2>
				<p className='mt-2 text-sm text-gray-500'>
					{error.message ||
						'An unexpected error occurred while loading the dashboard.'}
				</p>
				<button
					onClick={reset}
					className='mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
				>
					Try again
				</button>
			</div>
		</div>
	);
}
