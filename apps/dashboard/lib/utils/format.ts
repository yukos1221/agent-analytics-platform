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
