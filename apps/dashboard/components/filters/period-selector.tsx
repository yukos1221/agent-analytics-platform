/**
 * PeriodSelector Component
 *
 * Dropdown for selecting time period for metrics.
 *
 * Spec References:
 * - PRD §5.3: Date range picker (preset periods only for MVP)
 * - API Spec §6.2: period query param (1d | 7d | 30d | 90d)
 * - Frontend Spec §2.3: "Preset date ranges only (Last 7 days, Last 30 days, Last 90 days)"
 *
 * MVP Scope:
 * - Preset periods: 1d, 7d, 30d, 90d
 * - No custom date picker (Phase 3)
 *
 * Note: Using native HTML select for MVP stability.
 * Phase 2 can upgrade to Radix UI Select for better UX.
 */

'use client';

import { Calendar } from 'lucide-react';
import type { PeriodOption } from '@/lib/hooks';

interface PeriodSelectorProps {
	/**
	 * Currently selected period
	 */
	value: PeriodOption;

	/**
	 * Callback when period changes
	 */
	onChange: (period: PeriodOption) => void;

	/**
	 * Whether the selector is disabled
	 */
	disabled?: boolean;
}

/**
 * Period options matching API spec enum
 * Labels are user-friendly per PRD
 */
const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
	{ value: '1d', label: 'Last 24 hours' },
	{ value: '7d', label: 'Last 7 days' },
	{ value: '30d', label: 'Last 30 days' },
	{ value: '90d', label: 'Last 90 days' },
];

export function PeriodSelector({
	value,
	onChange,
	disabled = false,
}: PeriodSelectorProps) {
	return (
		<div className='flex items-center gap-2'>
			<Calendar className='h-4 w-4 text-gray-500' />
			<select
				value={value}
				onChange={(e) => onChange(e.target.value as PeriodOption)}
				disabled={disabled}
				data-testid='period-selector'
				className='h-10 w-[160px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
			>
				{PERIOD_OPTIONS.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}

/**
 * Get display label for a period value
 */
export function getPeriodLabel(period: PeriodOption): string {
	return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}
