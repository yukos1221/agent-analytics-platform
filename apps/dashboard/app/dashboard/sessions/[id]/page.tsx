import { notFound } from 'next/navigation';

interface PageProps {
	params: { id: string };
}

// Mock data for testing - matches API response structure
function getSession(sessionId: string) {
	return {
		session_id: sessionId,
		user_id: 'user_admin123',
		agent_id: 'agent_test',
		environment: 'production',
		status: 'completed',
		started_at: '2025-12-12T12:32:52.931Z',
		ended_at: '2025-12-12T12:34:52.932Z',
		duration_seconds: 120,
		metrics: {
			tasks_completed: 1,
			tasks_failed: 0,
			tasks_cancelled: 0,
			tokens_used: 4500,
			estimated_cost: 0.105,
			avg_task_duration_ms: 45000,
		},
	};
}

export default async function SessionDetailPage({ params }: PageProps) {
	const { id } = params;

	// Basic session ID validation
	if (!id || !id.startsWith('sess_') || id.length < 20) {
		notFound();
	}

	const session = await getSession(id);

	if (!session) {
		notFound();
	}

	return (
		<div className='container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8'>
			<div className='mb-4 sm:mb-6'>
				<h1 className='text-xl sm:text-2xl font-bold'>Session Details</h1>
				<p className='text-sm sm:text-base text-muted-foreground'>
					View detailed information and metrics for this session
				</p>
			</div>

			<div className='space-y-6'>
				<div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<h2 className='text-lg font-semibold mb-4'>
						Session: {session.session_id}
					</h2>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<p className='text-sm font-medium text-gray-500'>User ID</p>
							<p className='text-sm'>{session.user_id}</p>
						</div>
						<div>
							<p className='text-sm font-medium text-gray-500'>Agent ID</p>
							<p className='text-sm'>{session.agent_id}</p>
						</div>
						<div>
							<p className='text-sm font-medium text-gray-500'>Status</p>
							<p className='text-sm capitalize'>{session.status}</p>
						</div>
						<div>
							<p className='text-sm font-medium text-gray-500'>Duration</p>
							<p className='text-sm'>{session.duration_seconds || 0} seconds</p>
						</div>
					</div>
				</div>

				<div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<h3 className='text-lg font-semibold mb-4'>Metrics</h3>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<p className='text-sm font-medium text-gray-500'>
								Tasks Completed
							</p>
							<p className='text-sm'>{session.metrics.tasks_completed}</p>
						</div>
						<div>
							<p className='text-sm font-medium text-gray-500'>Tokens Used</p>
							<p className='text-sm'>
								{session.metrics.tokens_used?.toLocaleString() || 'N/A'}
							</p>
						</div>
						<div>
							<p className='text-sm font-medium text-gray-500'>
								Estimated Cost
							</p>
							<p className='text-sm'>${session.metrics.estimated_cost}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
