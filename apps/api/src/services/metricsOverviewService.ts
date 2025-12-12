/**
 * Metrics Overview Service
 *
 * Computes dashboard overview metrics from event data.
 *
 * @see docs/01-product-requirements.md Section 3 - Key Metrics Specification
 * @see docs/03-api-specification-v1.2.md Section 6.2 - Metrics API
 * @see specs/openapi.mvp.v1.yaml - MetricsOverviewResponse schema
 *
 * MVP P0 Metrics (per PRD):
 * - Daily/Weekly Active Users: Unique users running agent sessions per period
 * - Total Agent Sessions: Count of sessions (completed + running + failed)
 * - Session Success Rate: Completed sessions / Total sessions × 100%
 * - Total Spend: Cumulative platform cost (estimated from tokens)
 *
 * MVP P0 Optional:
 * - Avg Session Duration: Average execution time per session
 * - Error Count: Number of error events
 */

import { eventStore, type StoredEvent } from './index';
import {
	queryEventsByOrgRange,
	aggregateTokensByOrgRange,
} from '../../../../packages/database/src';
import type { MetricValue, Trend, PeriodQuery } from '../schemas';

/**
 * Period configuration for metric calculations
 */
interface PeriodConfig {
	days: number;
	startDate: Date;
	endDate: Date;
	previousStartDate: Date;
	previousEndDate: Date;
}

/**
 * Metrics calculation result
 */
export interface MetricsOverviewData {
	period: {
		start: string;
		end: string;
	};
	metrics: {
		active_users: MetricValue;
		total_sessions: MetricValue;
		success_rate: MetricValue;
		total_cost: MetricValue;
		avg_session_duration?: MetricValue;
		error_count?: MetricValue;
	};
}

/**
 * Calculate period boundaries based on period query parameter
 */
function getPeriodConfig(period: PeriodQuery): PeriodConfig {
	const periodDays: Record<PeriodQuery, number> = {
		'1d': 1,
		'7d': 7,
		'30d': 30,
		'90d': 90,
	};

	const days = periodDays[period];
	const now = new Date();

	// Current period: from (now - days) to now
	const endDate = now;
	const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

	// Previous period: from (now - 2*days) to (now - days)
	const previousEndDate = new Date(startDate.getTime());
	const previousStartDate = new Date(
		previousEndDate.getTime() - days * 24 * 60 * 60 * 1000
	);

	return {
		days,
		startDate,
		endDate,
		previousStartDate,
		previousEndDate,
	};
}

/**
 * Filter events by date range
 */
function filterEventsByDateRange(
	events: StoredEvent[],
	start: Date,
	end: Date
): StoredEvent[] {
	return events.filter((event) => {
		const eventTime = new Date(event.timestamp).getTime();
		return eventTime >= start.getTime() && eventTime <= end.getTime();
	});
}

/**
 * Calculate trend direction based on change
 */
function calculateTrend(current: number, previous: number): Trend {
	if (previous === 0) {
		return current > 0 ? 'up' : 'stable';
	}
	const changePercent = ((current - previous) / previous) * 100;
	if (changePercent > 1) return 'up';
	if (changePercent < -1) return 'down';
	return 'stable';
}

/**
 * Calculate percentage change
 */
function calculateChangePercent(current: number, previous: number): number {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return Number((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Build a MetricValue object with optional comparison data
 */
function buildMetricValue(
	current: number,
	previous: number | null,
	includeComparison: boolean,
	unit?: string
): MetricValue {
	const value: MetricValue = { value: current };

	if (unit) {
		value.unit = unit;
	}

	if (includeComparison && previous !== null) {
		value.previous = previous;
		value.change_percent = calculateChangePercent(current, previous);
		value.trend = calculateTrend(current, previous);
	}

	return value;
}

/**
 * Count unique users (DAU/WAU) from events
 *
 * Per PRD: "Daily/Weekly Active Users: Unique users running agent sessions per period"
 */
function countActiveUsers(events: StoredEvent[]): number {
	const uniqueUsers = new Set<string>();
	for (const event of events) {
		uniqueUsers.add(event.user_id);
	}
	return uniqueUsers.size;
}

/**
 * Count unique sessions from events
 *
 * Per PRD: "Total Agent Sessions: Count of initiated sessions"
 */
function countSessions(events: StoredEvent[]): number {
	const uniqueSessions = new Set<string>();
	for (const event of events) {
		uniqueSessions.add(event.session_id);
	}
	return uniqueSessions.size;
}

/**
 * Calculate session success rate
 *
 * Per PRD: "Session Success Rate: Completed sessions / Total sessions × 100%"
 *
 * A session is considered successful if it has a 'session_end' event and no 'error' events
 * A session is considered failed if it has 'task_error' or 'error' events
 * Incomplete sessions (no session_end) are counted in denominator but not as successful
 */
function calculateSuccessRate(events: StoredEvent[]): number {
	const sessionMap = new Map<string, { hasEnd: boolean; hasError: boolean }>();

	for (const event of events) {
		const session = sessionMap.get(event.session_id) || {
			hasEnd: false,
			hasError: false,
		};

		if (event.event_type === 'session_end') {
			session.hasEnd = true;
		}
		if (event.event_type === 'error' || event.event_type === 'task_error') {
			session.hasError = true;
		}

		sessionMap.set(event.session_id, session);
	}

	const totalSessions = sessionMap.size;

	if (totalSessions === 0) {
		return 100; // No sessions = 100% success rate (no failures)
	}

	// Count successful sessions (completed without errors)
	let successfulSessions = 0;
	for (const session of sessionMap.values()) {
		// A session is successful if it ended without errors
		if (session.hasEnd && !session.hasError) {
			successfulSessions++;
		}
	}

	return Number(((successfulSessions / totalSessions) * 100).toFixed(1));
}

/**
 * Estimate total cost from events
 *
 * Per PRD: "Total Spend: Cumulative platform cost for billing period"
 * Per PRD: "Cost per Session: Average cost breakdown (compute, tokens, storage)"
 *
 * For MVP, we estimate cost based on tokens in metadata:
 * - Input tokens: $0.003 per 1K tokens
 * - Output tokens: $0.015 per 1K tokens
 *
 * TODO: Use actual cost data from billing service in Phase 2
 */
function calculateTotalCost(events: StoredEvent[]): number {
	const INPUT_TOKEN_COST = 0.003 / 1000; // $0.003 per 1K input tokens
	const OUTPUT_TOKEN_COST = 0.015 / 1000; // $0.015 per 1K output tokens

	let totalCost = 0;

	for (const event of events) {
		const metadata = event.metadata as Record<string, unknown> | undefined;
		if (metadata) {
			const tokensInput = Number(metadata.tokens_input) || 0;
			const tokensOutput = Number(metadata.tokens_output) || 0;

			totalCost += tokensInput * INPUT_TOKEN_COST;
			totalCost += tokensOutput * OUTPUT_TOKEN_COST;
		}
	}

	return Number(totalCost.toFixed(2));
}

/**
 * Calculate average session duration
 *
 * Per PRD: "Session Duration: Average/P50/P90/P99 execution time per session"
 *
 * Duration is calculated from session_start to session_end events,
 * or from duration_ms in task metadata
 */
function calculateAvgSessionDuration(events: StoredEvent[]): number {
	const sessionTimes = new Map<string, { start?: number; end?: number }>();
	let totalDurationMs = 0;
	let durationCount = 0;

	for (const event of events) {
		const metadata = event.metadata as Record<string, unknown> | undefined;

		// Collect explicit duration from task events
		if (metadata?.duration_ms) {
			totalDurationMs += Number(metadata.duration_ms);
			durationCount++;
		}

		// Track session start/end times
		const times = sessionTimes.get(event.session_id) || {};
		if (event.event_type === 'session_start') {
			times.start = new Date(event.timestamp).getTime();
		}
		if (event.event_type === 'session_end') {
			times.end = new Date(event.timestamp).getTime();
		}
		sessionTimes.set(event.session_id, times);
	}

	// Calculate duration from session start/end pairs
	for (const times of sessionTimes.values()) {
		if (times.start && times.end) {
			totalDurationMs += times.end - times.start;
			durationCount++;
		}
	}

	if (durationCount === 0) {
		return 0;
	}

	// Return average duration in seconds
	return Math.round(totalDurationMs / durationCount / 1000);
}

/**
 * Count error events
 *
 * Per PRD: "Error Rate by Type: Breakdown: timeout, auth failure, sandbox crash, etc."
 */
function countErrors(events: StoredEvent[]): number {
	return events.filter(
		(e) =>
			e.event_type === 'error' ||
			e.event_type === 'task_error' ||
			e.event_type === 'warning'
	).length;
}

/**
 * Compute metrics overview for an organization
 *
 * @param orgId - Organization ID for tenant isolation
 * @param period - Time period (1d, 7d, 30d, 90d)
 * @param compare - Whether to include comparison with previous period
 * @returns Computed metrics matching OpenAPI MetricsOverviewResponse
 */
export async function computeMetricsOverview(
	orgId: string,
	period: PeriodQuery,
	compare: boolean
): Promise<MetricsOverviewData> {
	// Get period configuration
	const config = getPeriodConfig(period);

	// Fetch events and sessions for this organization from DB (fallback to in-memory)
	let allEvents: StoredEvent[] = [];
	const eventsRows = await queryEventsByOrgRange(
		orgId,
		config.startDate,
		config.endDate
	);
	if (
		eventsRows !== null &&
		Array.isArray(eventsRows) &&
		eventsRows.length > 0
	) {
		// Database is configured and returned events
		allEvents = eventsRows.map(
			(r) =>
				({
					event_id: r.event_id,
					org_id: r.org_id,
					session_id: r.session_id,
					user_id: r.user_id,
					agent_id: r.agent_id,
					event_type: r.event_type,
					timestamp:
						r.timestamp instanceof Date
							? r.timestamp.toISOString()
							: r.timestamp,
					environment: r.environment,
					metadata: r.metadata,
					ingested_at: r.ingested_at
						? r.ingested_at instanceof Date
							? r.ingested_at.toISOString()
							: r.ingested_at
						: new Date().toISOString(),
				} as StoredEvent)
		);
	} else {
		// No DB configured or DB returned no results: fallback to in-memory event store for the org
		allEvents = eventStore.getByOrg(orgId);
	}
	// Filter events by current period. If DB query returned rows they
	// should already be constrained by date, but when falling back to the
	// in-memory store we must apply the period filter explicitly.
	const currentEvents = filterEventsByDateRange(
		allEvents,
		config.startDate,
		config.endDate
	);

	// For previous period, try DB query first
	let previousEvents: StoredEvent[] = [];
	if (compare) {
		const prevRows = await queryEventsByOrgRange(
			orgId,
			config.previousStartDate,
			config.previousEndDate
		);
		if (prevRows !== null && Array.isArray(prevRows) && prevRows.length > 0) {
			// Database is configured and returned events
			previousEvents = prevRows.map(
				(r) =>
					({
						event_id: r.event_id,
						org_id: r.org_id,
						session_id: r.session_id,
						user_id: r.user_id,
						agent_id: r.agent_id,
						event_type: r.event_type,
						timestamp:
							r.timestamp instanceof Date
								? r.timestamp.toISOString()
								: r.timestamp,
						environment: r.environment,
						metadata: r.metadata,
						ingested_at: r.ingested_at
							? r.ingested_at instanceof Date
								? r.ingested_at.toISOString()
								: r.ingested_at
							: new Date().toISOString(),
					} as StoredEvent)
			);
		} else {
			// Fallback to in-memory filter
			const allOrgEvents = eventStore.getByOrg(orgId);
			previousEvents = filterEventsByDateRange(
				allOrgEvents,
				config.previousStartDate,
				config.previousEndDate
			);
		}
	}

	// Calculate current period metrics
	const currentActiveUsers = countActiveUsers(currentEvents);
	const currentSessions = countSessions(currentEvents);
	const currentSuccessRate = calculateSuccessRate(currentEvents);
	// If DB available, aggregate tokens for cost calculation
	let currentTotalCost = calculateTotalCost(currentEvents);
	const dbTokens = await aggregateTokensByOrgRange(
		orgId,
		config.startDate,
		config.endDate
	);
	if (dbTokens) {
		const INPUT_TOKEN_COST = 0.003 / 1000;
		const OUTPUT_TOKEN_COST = 0.015 / 1000;
		currentTotalCost = Number(
			(
				dbTokens.tokens_input * INPUT_TOKEN_COST +
				dbTokens.tokens_output * OUTPUT_TOKEN_COST
			).toFixed(2)
		);
	}
	const currentAvgDuration = calculateAvgSessionDuration(currentEvents);
	const currentErrorCount = countErrors(currentEvents);

	// Calculate previous period metrics (for comparison)
	const previousActiveUsers = compare ? countActiveUsers(previousEvents) : null;
	const previousSessions = compare ? countSessions(previousEvents) : null;
	const previousSuccessRate = compare
		? calculateSuccessRate(previousEvents)
		: null;
	const previousTotalCost = compare ? calculateTotalCost(previousEvents) : null;
	const previousAvgDuration = compare
		? calculateAvgSessionDuration(previousEvents)
		: null;
	const previousErrorCount = compare ? countErrors(previousEvents) : null;

	// Build response matching OpenAPI MetricsOverviewResponse schema
	return {
		period: {
			start: config.startDate.toISOString(),
			end: config.endDate.toISOString(),
		},
		metrics: {
			// Required metrics per OpenAPI spec
			active_users: buildMetricValue(
				currentActiveUsers,
				previousActiveUsers,
				compare
			),
			total_sessions: buildMetricValue(
				currentSessions,
				previousSessions,
				compare
			),
			success_rate: buildMetricValue(
				currentSuccessRate,
				previousSuccessRate,
				compare,
				'percent'
			),
			total_cost: buildMetricValue(
				currentTotalCost,
				previousTotalCost,
				compare,
				'usd'
			),
			// Optional metrics per OpenAPI spec
			avg_session_duration: buildMetricValue(
				currentAvgDuration,
				previousAvgDuration,
				compare,
				'seconds'
			),
			error_count: buildMetricValue(
				currentErrorCount,
				previousErrorCount,
				compare
			),
		},
	};
}
