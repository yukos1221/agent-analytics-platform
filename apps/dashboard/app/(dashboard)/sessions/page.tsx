import { Suspense } from 'react';
import { SessionTable } from '@/components/sessions/session-table';

export default function SessionsPage() {
	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-bold">Sessions</h1>
				<p className="text-muted-foreground">
					View and analyze agent sessions
				</p>
			</header>

			<Suspense fallback={<div className="text-center py-8">Loading sessions...</div>}>
				<SessionTable />
			</Suspense>
		</div>
	);
}
