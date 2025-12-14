/**
 * Date utilities for consistent date handling across the app.
 * Uses date-fns for reliable date operations.
 */

import { subDays } from 'date-fns';
import type { PeriodOption } from '@/lib/hooks';

/**
 * Convert a period option to start and end date range
 * Used for API calls that require start_time and end_time parameters
 *
 * Note: We use simple date arithmetic instead of startOfDay/endOfDay
 * to avoid timezone issues when converting to ISO strings
 */
export function getDateRangeForPeriod(period: PeriodOption): {
    start: Date;
    end: Date;
} {
    const now = new Date();
    const end = new Date(now.getTime()); // Current time

    let daysBack: number;
    switch (period) {
        case '1d':
            daysBack = 1;
            break;
        case '7d':
            daysBack = 7;
            break;
        case '30d':
            daysBack = 30;
            break;
        case '90d':
            daysBack = 90;
            break;
        default:
            daysBack = 7; // Default to 7d
    }

    // Calculate start time: subtract days and add a small buffer to ensure we catch all sessions
    // We subtract an extra day and add buffer to account for timezone differences
    const start = subDays(now, daysBack + 1);

    // Set to start of day in UTC to match database queries
    start.setUTCHours(0, 0, 0, 0);

    return {
        start,
        end,
    };
}

/**
 * Format a date for API calls (ISO string)
 */
export function formatDateForAPI(date: Date): string {
    return date.toISOString();
}
