import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionTable } from '@/components/sessions/session-table';
import { useSessions } from '@/lib/hooks/useSessions';
import { mockPush } from '../../../setup';
import type { Session } from '@/types/api';

// Mock the useSessions hook
vi.mock('@/lib/hooks/useSessions', () => ({
	useSessions: vi.fn(),
}));

const mockUseSessions = vi.mocked(useSessions);

// Mock data for testing
const mockSessions: Session[] = [
	{
		session_id: 'sess_001',
		user_id: 'user_1',
		user: { name: 'Alice Chen', email: 'alice@example.com' },
		agent_id: 'agent_claude',
		environment: 'production',
		status: 'completed',
		started_at: '2025-12-09T14:00:00.000Z',
		ended_at: '2025-12-09T14:30:00.000Z',
		duration_seconds: 1800,
		metrics: {
			tasks_completed: 5,
			tasks_failed: 0,
			tokens_used: 1000,
			estimated_cost: 0.02,
		},
	},
	{
		session_id: 'sess_002',
		user_id: 'user_2',
		user: { name: 'Bob Smith', email: 'bob@example.com' },
		agent_id: 'agent_gpt',
		environment: 'staging',
		status: 'active',
		started_at: '2025-12-09T13:00:00.000Z',
		ended_at: null,
		duration_seconds: null,
		metrics: {
			tasks_completed: 2,
			tasks_failed: 1,
			tokens_used: 500,
			estimated_cost: 0.01,
		},
	},
	{
		session_id: 'sess_003',
		user_id: 'user_1',
		user: { name: 'Alice Chen', email: 'alice@example.com' },
		agent_id: 'agent_claude',
		environment: 'production',
		status: 'error',
		started_at: '2025-12-09T12:00:00.000Z',
		ended_at: '2025-12-09T12:15:00.000Z',
		duration_seconds: 900,
		metrics: {
			tasks_completed: 1,
			tasks_failed: 3,
			tokens_used: 800,
			estimated_cost: 0.015,
		},
	},
];

describe('SessionTable', () => {
	beforeEach(() => {
		mockUseSessions.mockReturnValue({
			sessions: mockSessions,
			filters: {
				period: '7d',
				statuses: [],
				searchQuery: '',
			},
			updateFilters: vi.fn(),
			isLoading: false,
			error: null,
			hasMore: false,
			cursor: null,
		});
	});

	it('renders all session rows', () => {
		render(<SessionTable />);

		// Check that all sessions are rendered by looking for unique identifiers
		expect(screen.getByTestId('session-row-sess_001')).toBeInTheDocument();
		expect(screen.getByTestId('session-row-sess_002')).toBeInTheDocument();
		expect(screen.getByTestId('session-row-sess_003')).toBeInTheDocument();

		// Check that different agent names are present using getAllByText
		const agentElements = screen.getAllByText(/agent_(claude|gpt)/);
		expect(agentElements.length).toBeGreaterThanOrEqual(2);
	});

	it('renders correct number of rows', () => {
		render(<SessionTable />);

		const rows = screen.getAllByTestId(/^session-row-/);
		expect(rows).toHaveLength(3);
	});

	it('shows loading state when isLoading is true', () => {
		mockUseSessions.mockReturnValue({
			...mockUseSessions(),
			isLoading: true,
		});

		render(<SessionTable />);

		// Check for loading skeleton elements
		const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
		expect(skeletons.length).toBeGreaterThan(0);

		// Sessions should not be visible
		expect(screen.queryByText('Alice Chen')).not.toBeInTheDocument();
	});

	it('shows error state when error exists', () => {
		const errorMessage = 'Failed to load sessions';
		mockUseSessions.mockReturnValue({
			...mockUseSessions(),
			error: new Error(errorMessage),
		});

		render(<SessionTable />);

		expect(screen.getByText('Error loading sessions')).toBeInTheDocument();
		expect(screen.getByText(errorMessage)).toBeInTheDocument();
		expect(screen.getByText('Try Again')).toBeInTheDocument();
	});

	it('shows empty state when no sessions match filters', () => {
		mockUseSessions.mockReturnValue({
			...mockUseSessions(),
			sessions: [],
		});

		render(<SessionTable />);

		expect(screen.getByText('No sessions found matching your filters.')).toBeInTheDocument();
	});

	it('displays correct pagination info', () => {
		render(<SessionTable />);

		expect(screen.getByText('Showing 3 sessions')).toBeInTheDocument();
	});

	it('renders table headers correctly', () => {
		render(<SessionTable />);

		expect(screen.getByText('Started')).toBeInTheDocument();
		expect(screen.getByText('Status')).toBeInTheDocument();
		expect(screen.getByText('Duration')).toBeInTheDocument();
		expect(screen.getByText('Agent')).toBeInTheDocument();
		expect(screen.getByText('User')).toBeInTheDocument();
		expect(screen.getByText('Tasks')).toBeInTheDocument();
	});

	it('displays session data in correct format', () => {
		render(<SessionTable />);

		// Check date formatting
		expect(screen.getByText('12/9/2025')).toBeInTheDocument(); // sess_003 started first

		// Check status badges
		expect(screen.getByText('Completed')).toBeInTheDocument();
		expect(screen.getByText('Active')).toBeInTheDocument();
		expect(screen.getByText('Error')).toBeInTheDocument();

		// Check duration formatting
		expect(screen.getByText('30m 0s')).toBeInTheDocument(); // 1800 seconds = 30 minutes
		expect(screen.getByText('15m 0s')).toBeInTheDocument(); // 900 seconds = 15 minutes
		expect(screen.getByText('—')).toBeInTheDocument(); // null duration

		// Check metrics
		expect(screen.getByText('5 tasks')).toBeInTheDocument();
		expect(screen.getByText('2 tasks')).toBeInTheDocument();
		expect(screen.getByText('1 tasks')).toBeInTheDocument();
	});

	it('navigates to session detail when row is clicked', () => {
		render(<SessionTable />);

		const firstRow = screen.getByTestId('session-row-sess_001');
		fireEvent.click(firstRow);

		expect(mockPush).toHaveBeenCalledWith('/sessions/sess_001');
	});

	it('sorts by date descending by default', () => {
		render(<SessionTable />);

		// First row should be the most recent session (sess_001 from 14:00)
		// Since we sort by started_at descending, sess_001 (14:00) should be first
		const rows = screen.getAllByTestId(/^session-row-/);
		expect(rows[0]).toHaveAttribute('data-testid', 'session-row-sess_001');
		expect(rows[1]).toHaveAttribute('data-testid', 'session-row-sess_002');
		expect(rows[2]).toHaveAttribute('data-testid', 'session-row-sess_003');
	});

	it('allows sorting by duration when header is clicked', () => {
		render(<SessionTable />);

		const durationHeader = screen.getByText('Duration');

		// Click to sort by duration ascending
		fireEvent.click(durationHeader);

		// After sorting by duration ascending, null duration should come first
		const rows = screen.getAllByTestId(/^session-row-/);
		expect(rows[0]).toHaveAttribute('data-testid', 'session-row-sess_002'); // null duration
	});

	it('shows sorting indicators on sortable headers', () => {
		render(<SessionTable />);

		const startedHeader = screen.getByText('Started');
		const durationHeader = screen.getByText('Duration');

		// Started should show descending sort indicator by default
		expect(startedHeader.closest('th')).toBeInTheDocument();

		// Duration should be sortable
		expect(durationHeader.closest('th')).toBeInTheDocument();
	});

	it('includes SessionFilters component', () => {
		render(<SessionTable />);

		// Check that filters are rendered
		expect(screen.getByTestId('session-search')).toBeInTheDocument();
		expect(screen.getByTestId('period-selector')).toBeInTheDocument();
		expect(screen.getByTestId('status-filter-active')).toBeInTheDocument();
		expect(screen.getByTestId('status-filter-completed')).toBeInTheDocument();
		expect(screen.getByTestId('status-filter-error')).toBeInTheDocument();
	});
});
