'use client';

import { Search, Filter } from 'lucide-react';
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

	// Search filter
	searchQuery: string;
	onSearchChange: (query: string) => void;

	// Optional loading state
	isLoading?: boolean;
}

const STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
	{ value: 'active', label: 'Active' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'error', label: 'Error' },
	{ value: 'cancelled', label: 'Cancelled' },
];

export function SessionFilters({
	period,
	onPeriodChange,
	selectedStatuses,
	onStatusesChange,
	searchQuery,
	onSearchChange,
	isLoading = false,
}: SessionFiltersProps) {
	const handleStatusToggle = (status: SessionStatus) => {
		if (selectedStatuses.includes(status)) {
			onStatusesChange(selectedStatuses.filter(s => s !== status));
		} else {
			onStatusesChange([...selectedStatuses, status]);
		}
	};

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			{/* Search Input */}
			<div className="relative flex-1 max-w-md">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
				<input
					type="text"
					placeholder="Search sessions by ID or agent..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					disabled={isLoading}
					className="h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					data-testid="session-search"
				/>
			</div>

			{/* Filters Row */}
			<div className="flex flex-wrap items-center gap-4">
				{/* Period Selector */}
				<PeriodSelector
					value={period}
					onChange={onPeriodChange}
					disabled={isLoading}
				/>

				{/* Status Filter */}
				<div className="flex items-center gap-2">
					<Filter className="h-4 w-4 text-gray-500" />
					<div className="flex flex-wrap gap-1">
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
		</div>
	);
}
