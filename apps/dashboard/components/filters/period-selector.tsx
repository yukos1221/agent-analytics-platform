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
 */

'use client';

import { Calendar } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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
			<Select
				value={value}
				onValueChange={(newValue) => onChange(newValue as PeriodOption)}
				disabled={disabled}
			>
				<SelectTrigger className='w-[160px]' data-testid='period-selector'>
					<SelectValue placeholder='Select period' />
				</SelectTrigger>
				<SelectContent>
					{PERIOD_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

/**
 * Get display label for a period value
 */
export function getPeriodLabel(period: PeriodOption): string {
	return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}
