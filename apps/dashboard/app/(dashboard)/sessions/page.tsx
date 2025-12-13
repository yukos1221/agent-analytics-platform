import { Suspense } from 'react';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { SessionTable } from '@/components/sessions/session-table';
import { prefetchSessions } from '@/lib/hooks/useSessions';
import type { PeriodOption } from '@/lib/hooks';

interface PageProps {
	searchParams: {
		period?: PeriodOption;
		status?: string;
		agent?: string;
		user?: string;
		environment?: string;
	};
}

/**
 * Sessions List Page
 *
 * Displays agent sessions with filtering and sorting capabilities.
 * Per Frontend Architecture Spec §5.1 - /sessions route
 * Per API Spec v1.2 - GET /v1/sessions endpoint
 */
export default async function SessionsPage({ searchParams }: PageProps) {
	const queryClient = new QueryClient();

	// Extract filters from search params
	const period = searchParams.period || '7d';

	// Prefetch initial data on server for better UX
	await prefetchSessions(queryClient, period);

	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-bold">Agent Sessions</h1>
				<p className="text-muted-foreground">
					View and analyze AI agent sessions, their performance, and execution details
				</p>
			</header>

			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<SessionTable />}>
					<SessionTable />
				</Suspense>
			</HydrationBoundary>
		</div>
	);
}
