import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionDuration } from '@/components/sessions/session-duration';

describe('SessionDuration', () => {
	const durationCases: Array<{
		durationSeconds: number | null;
		expectedText: string;
		description: string;
	}> = [
		{
			durationSeconds: null,
			expectedText: '—',
			description: 'null duration',
		},
		{
			durationSeconds: null,
			expectedText: '—',
			description: 'null/undefined duration',
		},
		{
			durationSeconds: 0,
			expectedText: '0ms',
			description: 'zero duration',
		},
		{
			durationSeconds: 1,
			expectedText: '1s',
			description: 'one second',
		},
		{
			durationSeconds: 59,
			expectedText: '59s',
			description: 'under a minute',
		},
		{
			durationSeconds: 60,
			expectedText: '1m',
			description: 'exactly one minute',
		},
		{
			durationSeconds: 61,
			expectedText: '1m 1s',
			description: 'one minute and one second',
		},
		{
			durationSeconds: 3600,
			expectedText: '1h',
			description: 'exactly one hour',
		},
		{
			durationSeconds: 3661,
			expectedText: '1h 1m 1s',
			description: 'one hour, one minute, one second',
		},
		{
			durationSeconds: 7265,
			expectedText: '2h 1m 5s',
			description: 'complex duration',
		},
	];

	it.each(durationCases)(
		'renders $description correctly',
		({ durationSeconds, expectedText }) => {
			render(<SessionDuration durationSeconds={durationSeconds} />);

			expect(screen.getByText(expectedText)).toBeInTheDocument();
		}
	);

	it('applies additional className when provided', () => {
		render(<SessionDuration durationSeconds={60} className="text-red-500" />);

		const element = screen.getByText('1m');
		expect(element).toHaveClass('text-red-500');
	});

	it('formats millisecond durations correctly', () => {
		// Test that durations under 1 second show milliseconds
		render(<SessionDuration durationSeconds={0.5} />);

		// 0.5 seconds = 500ms, should show as "500ms"
		expect(screen.getByText('500ms')).toBeInTheDocument();
	});

	it('formats zero seconds correctly', () => {
		render(<SessionDuration durationSeconds={0} />);

		expect(screen.getByText('0ms')).toBeInTheDocument();
	});

	it('handles very large durations', () => {
		render(<SessionDuration durationSeconds={86400} />); // 24 hours

		expect(screen.getByText('24h')).toBeInTheDocument();
	});
});
