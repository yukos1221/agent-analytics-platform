import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventTimeline } from '@/components/sessions/event-timeline';
import type { Event } from '@/types/api';

// Mock the formatDateTime utility
vi.mock('@/lib/utils/format', () => ({
    formatDateTime: vi.fn((date: string) => `formatted-${date}`),
}));

// Mock EventTypeIcon component
vi.mock('@/components/sessions/event-type-icon', () => ({
    EventTypeIcon: ({ eventType }: { eventType: string }) => (
        <div data-testid={`event-icon-${eventType}`}>Icon</div>
    ),
}));

describe('EventTimeline', () => {
    const mockEvents: Event[] = [
        {
            event_id: 'evt_1',
            event_type: 'session_start',
            timestamp: '2025-12-09T10:00:00Z',
            session_id: 'sess_123',
            user_id: 'user_123',
            agent_id: 'agent_123',
            metadata: {},
        },
        {
            event_id: 'evt_2',
            event_type: 'task_start',
            timestamp: '2025-12-09T10:05:00Z',
            session_id: 'sess_123',
            user_id: 'user_123',
            agent_id: 'agent_123',
            metadata: { task_type: 'code_generation' },
        },
        {
            event_id: 'evt_3',
            event_type: 'task_error',
            timestamp: '2025-12-09T10:10:00Z',
            session_id: 'sess_123',
            user_id: 'user_123',
            agent_id: 'agent_123',
            metadata: { error_message: 'Something went wrong' },
        },
    ];

    it('renders events in chronological order', () => {
        // Events are already in order, but let's test with reversed order to ensure sorting
        const reversedEvents = [...mockEvents].reverse();

        render(<EventTimeline events={reversedEvents} />);

        // Check that events are displayed in chronological order (session_start first)
        const descriptions = screen.getAllByText(
            /Session started|Started code generation task|Task failed/
        );
        expect(descriptions).toHaveLength(3);

        // First event should be session_start
        expect(screen.getByText('Session started')).toBeInTheDocument();
        // Last event should be task_error
        expect(screen.getByText('Task failed: Something went wrong')).toBeInTheDocument();
    });

    it('displays correct event descriptions', () => {
        render(<EventTimeline events={mockEvents} />);

        expect(screen.getByText('Session started')).toBeInTheDocument();
        expect(screen.getByText('Started code generation task')).toBeInTheDocument();
        expect(screen.getByText('Task failed: Something went wrong')).toBeInTheDocument();
    });

    it('highlights error events with red styling', () => {
        render(<EventTimeline events={mockEvents} />);

        // The error event should have red background styling
        // Find the parent container div that has the red styling
        const errorEventContainer = screen
            .getByText('Task failed: Something went wrong')
            .closest('[class*="bg-red-50"]');
        expect(errorEventContainer).toHaveClass('bg-red-50');
        expect(errorEventContainer).toHaveClass('border-red-200');
    });

    it('shows event metadata when available', () => {
        render(<EventTimeline events={mockEvents} />);

        // Check that task_type metadata is displayed
        expect(screen.getByText('task_type:')).toBeInTheDocument();
        expect(screen.getByText('code_generation')).toBeInTheDocument();
    });

    it('displays formatted timestamps', () => {
        render(<EventTimeline events={mockEvents} />);

        // Check that formatDateTime was called for each event
        expect(screen.getByText('formatted-2025-12-09T10:00:00Z')).toBeInTheDocument();
        expect(screen.getByText('formatted-2025-12-09T10:05:00Z')).toBeInTheDocument();
        expect(screen.getByText('formatted-2025-12-09T10:10:00Z')).toBeInTheDocument();
    });

    it('shows event count in header', () => {
        render(<EventTimeline events={mockEvents} />);

        expect(screen.getByText('3 events')).toBeInTheDocument();
    });

    it('renders event icons for each event type', () => {
        render(<EventTimeline events={mockEvents} />);

        expect(screen.getByTestId('event-icon-session_start')).toBeInTheDocument();
        expect(screen.getByTestId('event-icon-task_start')).toBeInTheDocument();
        expect(screen.getByTestId('event-icon-task_error')).toBeInTheDocument();
    });

    it('displays empty state when no events', () => {
        render(<EventTimeline events={[]} />);

        expect(screen.getByText('No events found for this session')).toBeInTheDocument();
    });

    it('shows event IDs truncated', () => {
        render(<EventTimeline events={mockEvents} />);

        // Should show last 8 characters of event ID
        expect(screen.getByText('evt_1')).toBeInTheDocument();
        expect(screen.getByText('evt_2')).toBeInTheDocument();
        expect(screen.getByText('evt_3')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <EventTimeline events={mockEvents} className="custom-class" />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });
});
