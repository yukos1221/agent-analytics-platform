'use client';

import { Filter } from 'lucide-react';
import { PeriodSelector } from '@/components/filters/period-selector';
import type { PeriodOption } from '@/lib/hooks';
import type { SessionStatus } from '@/types/api';

interface SessionFiltersProps {
	// Date range filter
	period: PeriodOption;
	onPeriodChange: (period: PeriodOption) => void;

	// Status filter
	selectedStatuses: SessionStatus[];
	onStatusesChange: (statuses: SessionStatus[]) => void;

	// Optional loading state
	isLoading?: boolean;
}

const STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
	{ value: 'active', label: 'Active' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'error', label: 'Error' },
];

export function SessionFilters({
	period,
	onPeriodChange,
	selectedStatuses,
	onStatusesChange,
	isLoading = false,
}: SessionFiltersProps) {
	const handleStatusToggle = (status: SessionStatus) => {
		if (selectedStatuses.includes(status)) {
			onStatusesChange(selectedStatuses.filter((s) => s !== status));
		} else {
			onStatusesChange([...selectedStatuses, status]);
		}
	};

	return (
		<div className='flex flex-wrap items-center justify-end gap-4'>
			{/* Period Selector */}
			<PeriodSelector
				value={period}
				onChange={onPeriodChange}
				disabled={isLoading}
			/>

			{/* Status Filter */}
			<div className='flex items-center gap-2'>
				<Filter className='h-4 w-4 text-gray-500' />
				<div className='flex flex-wrap gap-1'>
					{STATUS_OPTIONS.map((option) => {
						const isSelected = selectedStatuses.includes(option.value);
						return (
							<button
								key={option.value}
								onClick={() => handleStatusToggle(option.value)}
								disabled={isLoading}
								className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
									isSelected
										? 'border-blue-500 bg-blue-50 text-blue-700'
										: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
								} disabled:cursor-not-allowed disabled:opacity-50`}
								data-testid={`status-filter-${option.value}`}
							>
								{option.label}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
