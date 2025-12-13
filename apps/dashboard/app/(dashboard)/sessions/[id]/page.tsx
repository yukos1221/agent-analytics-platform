import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SessionDetailHeader, SessionMetrics, EventTimeline } from '@/components/sessions';
import { useSession, useSessionEvents } from '@/lib/hooks/useSessions';
import type { SessionDetailResponse } from '@/types/api';

interface PageProps {
	params: Promise<{ id: string }>;
}

// Loading skeleton component
function SessionDetailSkeleton() {
	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div className="flex items-start justify-between mb-6">
					<div className="space-y-1">
						<div className="h-6 w-48 skeleton" />
						<div className="h-4 w-32 skeleton" />
					</div>
					<div className="h-6 w-16 skeleton" />
				</div>
				<div className="grid gap-6 md:grid-cols-2">
					<div className="space-y-4">
						<div>
							<div className="h-4 w-20 skeleton mb-2" />
							<div className="space-y-2">
								<div className="flex justify-between">
									<div className="h-4 w-12 skeleton" />
									<div className="h-4 w-16 skeleton" />
								</div>
								<div className="flex justify-between">
									<div className="h-4 w-12 skeleton" />
									<div className="h-4 w-16 skeleton" />
								</div>
								<div className="flex justify-between">
									<div className="h-4 w-12 skeleton" />
									<div className="h-4 w-16 skeleton" />
								</div>
							</div>
						</div>
					</div>
					<div className="space-y-4">
						<div>
							<div className="h-4 w-16 skeleton mb-2" />
							<div className="space-y-2">
								<div className="flex justify-between">
									<div className="h-4 w-12 skeleton" />
									<div className="h-4 w-16 skeleton" />
								</div>
								<div className="flex justify-between">
									<div className="h-4 w-12 skeleton" />
									<div className="h-4 w-16 skeleton" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="h-4 w-16 skeleton mb-4" />
					<div className="h-8 w-24 skeleton mb-4" />
					<div className="space-y-2">
						<div className="flex justify-between">
							<div className="h-4 w-20 skeleton" />
							<div className="h-4 w-12 skeleton" />
						</div>
						<div className="flex justify-between">
							<div className="h-4 w-16 skeleton" />
							<div className="h-4 w-12 skeleton" />
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="h-4 w-20 skeleton mb-4" />
					<div className="h-8 w-24 skeleton mb-4" />
					<div className="space-y-2">
						<div className="flex justify-between">
							<div className="h-4 w-12 skeleton" />
							<div className="h-4 w-16 skeleton" />
						</div>
						<div className="flex justify-between">
							<div className="h-4 w-12 skeleton" />
							<div className="h-4 w-16 skeleton" />
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div className="h-4 w-24 skeleton mb-4" />
					<div className="h-8 w-20 skeleton mb-4" />
					<div className="space-y-2">
						<div className="flex justify-between">
							<div className="h-4 w-16 skeleton" />
							<div className="h-4 w-12 skeleton" />
						</div>
						<div className="flex justify-between">
							<div className="h-4 w-20 skeleton" />
							<div className="h-4 w-12 skeleton" />
						</div>
					</div>
				</div>
			</div>

			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div className="mb-4">
					<div className="text-sm font-medium">Event Timeline</div>
				</div>
				<div className="text-center py-8 text-gray-500">
					Event timeline component coming in next phase
				</div>
			</div>
		</div>
	);
}

// Error state component
function SessionErrorState({ error }: { error: Error }) {
	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<div className="text-center py-8">
					<div className="text-red-500 mb-4">
						Failed to load session details
					</div>
					<div className="text-sm text-gray-500">
						{error.message}
					</div>
				</div>
			</div>
		</div>
	);
}

// Client component for data fetching
function SessionDetailClient({ sessionId }: { sessionId: string }) {
	const { data: session, isLoading, error } = useSession(sessionId);
	const {
		data: eventsData,
		isLoading: eventsLoading,
		error: eventsError,
		fetchNextPage,
		hasNextPage,
	} = useSessionEvents(sessionId, !!session);

	if (isLoading) {
		return <SessionDetailSkeleton />;
	}

	if (error) {
		return <SessionErrorState error={error as Error} />;
	}

	if (!session) {
		notFound();
	}

	// Flatten all events from all pages
	const allEvents = eventsData?.pages.flatMap(page => page.events) || [];

	return (
		<div className="space-y-6">
			<SessionDetailHeader session={session} />
			<SessionMetrics session={session} />

			{/* Event Timeline */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<EventTimeline events={allEvents} />
				{hasNextPage && (
					<div className="text-center pt-4 border-t border-gray-200 mt-4">
						<button
							onClick={() => fetchNextPage()}
							disabled={eventsLoading}
							className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{eventsLoading ? 'Loading...' : 'Load more events'}
						</button>
					</div>
				)}
				{eventsError && (
					<div className="text-center pt-4 border-t border-gray-200 mt-4 text-red-600 text-sm">
						Failed to load events: {(eventsError as Error).message}
					</div>
				)}
			</div>
		</div>
	);
}

// Server component for initial render
export default async function SessionDetailPage({ params }: PageProps) {
	const { id } = await params;

	// Basic session ID validation
	if (!id || !id.startsWith('sess_') || id.length < 20) {
		notFound();
	}

	return (
		<div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
			<div className="mb-4 sm:mb-6">
				<h1 className="text-xl sm:text-2xl font-bold">Session Details</h1>
				<p className="text-sm sm:text-base text-muted-foreground">
					View detailed information and metrics for this session
				</p>
			</div>

			<Suspense fallback={<SessionDetailSkeleton />}>
				<SessionDetailClient sessionId={id} />
			</Suspense>
		</div>
	);
}
