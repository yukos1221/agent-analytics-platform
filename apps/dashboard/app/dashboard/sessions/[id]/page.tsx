'use client';

import { SessionDetailHeader } from '@/components/sessions/session-detail-header';
import { EventTimeline } from '@/components/sessions/event-timeline';
import { useSession, useSessionEvents } from '@/lib/hooks/useSessions';
import { notFound } from 'next/navigation';

interface PageProps {
    params: { id: string };
}

export default function SessionDetailPage({ params }: PageProps) {
    const { id } = params;

    // Basic session ID validation
    if (!id || !id.startsWith('sess_') || id.length < 20) {
        notFound();
    }

    // Fetch session data using React Query hook
    const { data: session, isLoading: sessionLoading, error: sessionError } = useSession(id);

    // Fetch session events for timeline
    const { data: eventsData, isLoading: eventsLoading } = useSessionEvents(id);
    const events = eventsData?.pages.flatMap((page) => page.events) || [];

    const isLoading = sessionLoading || eventsLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-64 bg-gray-200 rounded" />
                    <div className="h-64 bg-gray-200 rounded" />
                </div>
            </div>
        );
    }

    if (sessionError || !session) {
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

            <div className="space-y-6">
                <SessionDetailHeader session={session} />

                {events.length > 0 ? (
                    <EventTimeline events={events} />
                ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Event Timeline</h3>
                        <p className="text-sm text-gray-500">
                            No events available for this session.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
