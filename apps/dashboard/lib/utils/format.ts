/**
 * Formatting utilities with fixed locale to prevent SSR/client hydration mismatches.
 * Always use 'en-US' locale for consistent number formatting.
 */

const LOCALE = 'en-US';

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number): string {
	return value.toLocaleString(LOCALE);
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(
	value: number,
	options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
	const formatted = value.toLocaleString(LOCALE, {
		minimumFractionDigits: options?.minimumFractionDigits ?? 2,
		maximumFractionDigits: options?.maximumFractionDigits ?? 2,
	});
	return `$${formatted}`;
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number, decimals = 1): string {
	return `${value.toFixed(decimals)}%`;
}

/**
 * Format duration in milliseconds to human readable string
 * Examples: 65000ms → "1m 5s", 3725000ms → "1h 2m 5s"
 */
export function formatDuration(milliseconds: number): string {
	if (milliseconds < 1000) {
		return `${milliseconds}ms`;
	}

	const totalSeconds = Math.floor(milliseconds / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const parts: string[] = [];

	if (hours > 0) {
		parts.push(`${hours}h`);
	}
	if (minutes > 0) {
		parts.push(`${minutes}m`);
	}
	if (seconds > 0 || parts.length === 0) {
		parts.push(`${seconds}s`);
	}

	return parts.join(' ');
}

/**
 * Format a date/time string for display
 * Uses consistent locale to prevent hydration mismatches
 */
export function formatDateTime(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleString(LOCALE, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}
