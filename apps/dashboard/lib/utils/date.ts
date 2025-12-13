/**
 * Date utilities for consistent date handling across the app.
 * Uses date-fns for reliable date operations.
 */

import { startOfDay, endOfDay, subDays } from 'date-fns';
import type { PeriodOption } from '@/lib/hooks';

/**
 * Convert a period option to start and end date range
 * Used for API calls that require start_time and end_time parameters
 */
export function getDateRangeForPeriod(period: PeriodOption): {
	start: Date;
	end: Date;
} {
	const now = new Date();

	switch (period) {
		case '1d':
			return {
				start: startOfDay(now),
				end: endOfDay(now),
			};
		case '7d':
			return {
				start: startOfDay(subDays(now, 7)),
				end: endOfDay(now),
			};
		case '30d':
			return {
				start: startOfDay(subDays(now, 30)),
				end: endOfDay(now),
			};
		case '90d':
			return {
				start: startOfDay(subDays(now, 90)),
				end: endOfDay(now),
			};
		default:
			// Default to 7d
			return {
				start: startOfDay(subDays(now, 7)),
				end: endOfDay(now),
			};
	}
}

/**
 * Format a date for API calls (ISO string)
 */
export function formatDateForAPI(date: Date): string {
	return date.toISOString();
}
