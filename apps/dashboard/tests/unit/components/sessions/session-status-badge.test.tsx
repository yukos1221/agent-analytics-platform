import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionStatusBadge } from '@/components/sessions/session-status-badge';
import type { SessionStatus } from '@/types/api';

describe('SessionStatusBadge', () => {
	const statusCases: Array<{
		status: SessionStatus;
		label: string;
		expectedClasses: string[];
	}> = [
		{
			status: 'active',
			label: 'Active',
			expectedClasses: ['bg-blue-50', 'text-blue-700', 'border-blue-200'],
		},
		{
			status: 'completed',
			label: 'Completed',
			expectedClasses: ['bg-green-50', 'text-green-700', 'border-green-200'],
		},
		{
			status: 'error',
			label: 'Error',
			expectedClasses: ['bg-red-50', 'text-red-700', 'border-red-200'],
		},
	];

	it.each(statusCases)(
		'renders $label status with correct styles',
		({ status, label, expectedClasses }) => {
			render(<SessionStatusBadge status={status} />);

			// Check that the label is displayed
			expect(screen.getByText(label)).toBeInTheDocument();

			// Check that the badge has the expected styling classes
			const badge = screen.getByText(label).closest('span');
			expect(badge).toBeInTheDocument();
			expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1.5', 'rounded-full', 'border', 'px-2.5', 'py-0.5', 'text-xs', 'font-medium');

			// Check status-specific classes
			expectedClasses.forEach(className => {
				expect(badge).toHaveClass(className);
			});
		}
	);

	it('applies additional className when provided', () => {
		render(<SessionStatusBadge status="active" className="custom-class" />);

		const badge = screen.getByText('Active').closest('span');
		expect(badge).toHaveClass('custom-class');
	});

	it('includes an icon for each status', () => {
		render(<SessionStatusBadge status="active" />);

		// Find the SVG icon within the badge
		const badge = screen.getByText('Active').closest('span');
		const icon = badge?.querySelector('svg');
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass('h-3', 'w-3', 'text-blue-500');
	});
});
