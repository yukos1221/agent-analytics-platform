import { useMemo, memo } from 'react';
import { format } from 'date-fns';
import { EventTypeIcon } from './event-type-icon';
import { formatDateTime } from '@/lib/utils/format';
import type { Event } from '@/types/api';

interface EventTimelineProps {
    events: Event[];
    className?: string;
}

interface TimelineEvent {
    event: Event;
    description: string;
    isError: boolean;
}

/**
 * Generate a short description for an event based on its type and metadata
 */
function getEventDescription(event: Event): string {
    const { event_type, metadata } = event;

    switch (event_type) {
        case 'session_start':
            return 'Session started';
        case 'session_end':
            return 'Session ended';
        case 'session_pause':
            return 'Session paused';
        case 'session_resume':
            return 'Session resumed';
        case 'task_start':
            return metadata?.task_type && typeof metadata.task_type === 'string'
                ? `Started ${metadata.task_type.replace('_', ' ')} task`
                : 'Task started';
        case 'task_complete':
            return metadata?.task_type && typeof metadata.task_type === 'string'
                ? `Completed ${metadata.task_type.replace('_', ' ')} task`
                : 'Task completed';
        case 'task_error':
            return metadata?.error_message
                ? `Task failed: ${metadata.error_message}`
                : 'Task failed';
        case 'task_cancel':
            return 'Task cancelled';
        case 'tool_call':
            return metadata?.tool_name ? `Called tool: ${metadata.tool_name}` : 'Tool called';
        case 'tool_response':
            return metadata?.tool_name ? `Tool ${metadata.tool_name} responded` : 'Tool responded';
        case 'error':
            return metadata?.error_message ? `Error: ${metadata.error_message}` : 'Error occurred';
        case 'warning':
            return metadata?.message ? `Warning: ${metadata.message}` : 'Warning issued';
        case 'feedback_positive':
            return 'Positive feedback received';
        case 'feedback_negative':
            return metadata?.reason
                ? `Negative feedback: ${metadata.reason}`
                : 'Negative feedback received';
        default:
            return `Event: ${event_type}`;
    }
}

/**
 * Determine if an event should be highlighted as an error
 */
function isErrorEvent(eventType: Event['event_type']): boolean {
    return ['error', 'task_error', 'feedback_negative'].includes(eventType);
}

export const EventTimeline = memo(function EventTimeline({
    events,
    className,
}: EventTimelineProps) {
    const timelineEvents = useMemo((): TimelineEvent[] => {
        // Sort events chronologically (ascending by timestamp)
        const sortedEvents = [...events].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return sortedEvents.map((event) => ({
            event,
            description: getEventDescription(event),
            isError: isErrorEvent(event.event_type),
        }));
    }, [events]);

    if (timelineEvents.length === 0) {
        return (
            <div className={`text-center py-8 text-gray-500 ${className}`}>
                No events found for this session
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Timeline header */}
            <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium">Event Timeline</h3>
                <span className="text-xs sm:text-sm text-gray-500">
                    {timelineEvents.length} events
                </span>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Events */}
                {/* TODO: Phase 2 - Add virtualized list for sessions with 1000+ events */}
                {/* TODO: Phase 2 - Add timeline zoom/filter controls */}
                {/* TODO: Phase 2 - Add event search and highlighting */}
                <div className="space-y-6 max-h-96 overflow-y-auto">
                    {timelineEvents.map((timelineEvent, index) => {
                        const { event, description, isError } = timelineEvent;
                        const timestamp = new Date(event.timestamp);

                        return (
                            <div
                                key={event.event_id}
                                className={`relative flex items-start gap-3 sm:gap-4 ${
                                    isError
                                        ? 'bg-red-50 p-2 sm:p-3 rounded-lg border border-red-200'
                                        : ''
                                }`}
                            >
                                {/* Timeline dot */}
                                <div
                                    className={`relative z-10 flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${
                                        isError
                                            ? 'bg-red-500'
                                            : event.event_type.startsWith('session_')
                                            ? 'bg-blue-500'
                                            : event.event_type.startsWith('task_')
                                            ? 'bg-green-500'
                                            : event.event_type.startsWith('tool_')
                                            ? 'bg-purple-500'
                                            : 'bg-gray-500'
                                    }`}
                                >
                                    <EventTypeIcon
                                        eventType={event.event_type}
                                        size="sm"
                                        className="text-white"
                                    />
                                </div>

                                {/* Event content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-gray-900">
                                            {description}
                                        </span>
                                        {isError && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                Error
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                                        <span className="truncate">
                                            {formatDateTime(event.timestamp)}
                                        </span>
                                        <div className="flex gap-2 sm:gap-4">
                                            <span>{format(timestamp, 'HH:mm:ss')}</span>
                                            <span className="font-mono hidden sm:inline">
                                                {event.event_id.slice(-8)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Show metadata for complex events */}
                                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                            {Object.entries(event.metadata)
                                                .filter(
                                                    ([key]) =>
                                                        key !== 'error_message' &&
                                                        key !== 'message' &&
                                                        key !== 'reason'
                                                ) // These are already in description
                                                .slice(0, 3) // Limit to 3 metadata items
                                                .map(([key, value]) => (
                                                    <div key={key}>
                                                        <span className="font-medium">{key}:</span>{' '}
                                                        {typeof value === 'string'
                                                            ? value
                                                            : JSON.stringify(value)}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Load more button if pagination is available */}
            {timelineEvents.length >= 100 && (
                <div className="text-center pt-4 border-t border-gray-200">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Load more events
                    </button>
                </div>
            )}
        </div>
    );
});
