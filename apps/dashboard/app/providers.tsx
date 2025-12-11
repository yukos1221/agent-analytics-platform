'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
	// Create query client with default options per Frontend Architecture spec
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Stale time of 30 seconds for dashboard data
						staleTime: 30 * 1000,
						// Garbage collection after 5 minutes
						gcTime: 5 * 60 * 1000,
						// Retry failed requests once
						retry: 1,
						// Refetch on window focus for fresh data
						refetchOnWindowFocus: true,
					},
				},
			})
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
