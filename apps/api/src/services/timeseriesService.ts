/**
 * Timeseries Service
 *
 * Provides time-series data for charting metrics over time.
 *
 * @see docs/03-api-specification-v1.2.md Section 6.2 - Metrics API
 * @see specs/openapi.mvp.v1.yaml - MetricsTimeseriesResponse schema
 */

import { eventStore, type StoredEvent } from './index';
import {
	queryEventsByOrgRange,
	querySessionsByOrgRange,
} from '../../../../packages/database/src';
import type {
	TimeseriesMetric,
	TimeseriesQuery,
	TimeseriesPoint,
	Aggregations,
	PeriodQuery,
	Granularity,
} from '../schemas';

/**
 * Calculate period boundaries based on period query parameter
 */
function getPeriodConfig(period: PeriodQuery): {
	startDate: Date;
	endDate: Date;
} {
	const periodDays: Record<PeriodQuery, number> = {
		'1d': 1,
		'7d': 7,
		'30d': 30,
		'90d': 90,
	};

	const days = periodDays[period];
	const now = new Date();
	const endDate = now;
	const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

	return { startDate, endDate };
}

/**
 * Determine granularity based on period if not specified
 */
function getGranularity(
	period: PeriodQuery,
	specified?: Granularity
): Granularity {
	if (specified) return specified;

	// Default granularity based on period
	if (period === '1d') return 'hour';
	if (period === '7d' || period === '30d') return 'day';
	return 'week'; // 90d
}

/**
 * Generate time buckets for aggregation
 */
function generateTimeBuckets(
	start: Date,
	end: Date,
	granularity: Granularity
): Date[] {
	const buckets: Date[] = [];
	const current = new Date(start);

	// Round down to bucket boundary
	if (granularity === 'hour') {
		current.setMinutes(0, 0, 0);
	} else if (granularity === 'day') {
		current.setHours(0, 0, 0, 0);
	} else if (granularity === 'week') {
		// Round to start of week (Monday)
		const day = current.getDay();
		const diff = current.getDate() - day + (day === 0 ? -6 : 1);
		current.setDate(diff);
		current.setHours(0, 0, 0, 0);
	}

	while (current <= end) {
		buckets.push(new Date(current));

		// Advance to next bucket
		if (granularity === 'hour') {
			current.setHours(current.getHours() + 1);
		} else if (granularity === 'day') {
			current.setDate(current.getDate() + 1);
		} else if (granularity === 'week') {
			current.setDate(current.getDate() + 7);
		}
	}

	return buckets;
}

/**
 * Calculate metric value for a time bucket
 */
function calculateMetricForBucket(
	metric: TimeseriesMetric,
	events: StoredEvent[],
	bucketStart: Date,
	bucketEnd: Date
): number {
	const bucketEvents = events.filter((e) => {
		const eventTime = new Date(e.timestamp).getTime();
		return (
			eventTime >= bucketStart.getTime() && eventTime < bucketEnd.getTime()
		);
	});

	switch (metric) {
		case 'active_users': {
			const uniqueUsers = new Set(bucketEvents.map((e) => e.user_id));
			return uniqueUsers.size;
		}

		case 'total_sessions': {
			const uniqueSessions = new Set(bucketEvents.map((e) => e.session_id));
			return uniqueSessions.size;
		}

		case 'session_duration': {
			// Calculate average session duration from events
			const sessionMap = new Map<string, { start: Date; end?: Date }>();

			for (const event of bucketEvents) {
				if (!sessionMap.has(event.session_id)) {
					sessionMap.set(event.session_id, {
						start: new Date(event.timestamp),
					});
				}

				const session = sessionMap.get(event.session_id)!;
				if (event.event_type === 'session_end') {
					session.end = new Date(event.timestamp);
				}
			}

			const durations: number[] = [];
			for (const session of sessionMap.values()) {
				if (session.end) {
					durations.push(
						(session.end.getTime() - session.start.getTime()) / 1000
					);
				}
			}

			return durations.length > 0
				? durations.reduce((sum, d) => sum + d, 0) / durations.length
				: 0;
		}

		case 'success_rate': {
			const sessionMap = new Map<
				string,
				{ completed: boolean; hasError: boolean }
			>();

			for (const event of bucketEvents) {
				if (!sessionMap.has(event.session_id)) {
					sessionMap.set(event.session_id, {
						completed: false,
						hasError: false,
					});
				}

				const session = sessionMap.get(event.session_id)!;
				if (event.event_type === 'session_end') {
					session.completed = true;
				}
				if (event.event_type === 'error' || event.event_type === 'task_error') {
					session.hasError = true;
				}
			}

			const totalSessions = sessionMap.size;
			if (totalSessions === 0) return 100; // No sessions = 100% success

			const successfulSessions = Array.from(sessionMap.values()).filter(
				(s) => s.completed && !s.hasError
			).length;

			return (successfulSessions / totalSessions) * 100;
		}

		case 'error_rate': {
			const sessionMap = new Map<string, boolean>();

			for (const event of bucketEvents) {
				if (event.event_type === 'error' || event.event_type === 'task_error') {
					sessionMap.set(event.session_id, true);
				}
			}

			const totalSessions = new Set(bucketEvents.map((e) => e.session_id)).size;
			if (totalSessions === 0) return 0;

			return (sessionMap.size / totalSessions) * 100;
		}

		case 'tokens_used': {
			let totalTokens = 0;
			for (const event of bucketEvents) {
				const metadata = event.metadata as {
					tokens_input?: number;
					tokens_output?: number;
				};
				if (metadata?.tokens_input) {
					totalTokens += metadata.tokens_input;
				}
				if (metadata?.tokens_output) {
					totalTokens += metadata.tokens_output;
				}
			}
			return totalTokens;
		}

		case 'cost': {
			let tokensInput = 0;
			let tokensOutput = 0;

			for (const event of bucketEvents) {
				const metadata = event.metadata as {
					tokens_input?: number;
					tokens_output?: number;
				};
				if (metadata?.tokens_input) {
					tokensInput += metadata.tokens_input;
				}
				if (metadata?.tokens_output) {
					tokensOutput += metadata.tokens_output;
				}
			}

			// Simplified cost calculation: $0.00001 per input token, $0.00003 per output token
			return tokensInput * 0.00001 + tokensOutput * 0.00003;
		}

		default:
			return 0;
	}
}

/**
 * Calculate aggregations from data points
 */
function calculateAggregations(
	points: TimeseriesPoint[]
): Aggregations | undefined {
	if (points.length === 0) return undefined;

	const values = points.map((p) => p.value).sort((a, b) => a - b);
	const sum = values.reduce((s, v) => s + v, 0);
	const min = values[0];
	const max = values[values.length - 1];
	const avg = sum / values.length;

	const p50Index = Math.floor(values.length * 0.5);
	const p95Index = Math.floor(values.length * 0.95);

	return {
		min,
		max,
		avg: Number(avg.toFixed(2)),
		sum,
		p50: values[p50Index],
		p95: values[p95Index],
	};
}

/**
 * Get timeseries data for a metric
 */
export async function getMetricsTimeseries(
	orgId: string,
	query: TimeseriesQuery
): Promise<{
	metric: TimeseriesMetric;
	period: { start: string; end: string; granularity?: Granularity };
	granularity: Granularity;
	data: TimeseriesPoint[];
	aggregations?: Aggregations;
}> {
	const startTime = Date.now();
	const { metric, period } = query;
	const granularity = getGranularity(period, query.granularity);

	// Get period boundaries
	const { startDate, endDate } = getPeriodConfig(period);

	// Fetch events from database (fallback to in-memory)
	let allEvents: StoredEvent[] = [];
	const eventsRows = await queryEventsByOrgRange(orgId, startDate, endDate);

	if (
		eventsRows !== null &&
		Array.isArray(eventsRows) &&
		eventsRows.length > 0
	) {
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
		// Fallback to in-memory store
		allEvents = eventStore.getByOrg(orgId).filter((e) => {
			const eventTime = new Date(e.timestamp).getTime();
			return eventTime >= startDate.getTime() && eventTime <= endDate.getTime();
		});
	}

	// Generate time buckets
	const buckets = generateTimeBuckets(startDate, endDate, granularity);

	// Calculate metric value for each bucket
	const data: TimeseriesPoint[] = [];

	for (let i = 0; i < buckets.length; i++) {
		const bucketStart = buckets[i];
		// For the last bucket, use endDate; otherwise use next bucket start
		const bucketEnd = i < buckets.length - 1 ? buckets[i + 1] : endDate;

		const value = calculateMetricForBucket(
			metric,
			allEvents,
			bucketStart,
			bucketEnd
		);

		data.push({
			timestamp: bucketStart.toISOString(),
			value: Number(value.toFixed(2)),
		});
	}

	// Calculate aggregations
	const aggregations = calculateAggregations(data);

	const queryTimeMs = Date.now() - startTime;

	return {
		metric,
		period: {
			start: startDate.toISOString(),
			end: endDate.toISOString(),
			granularity,
		},
		granularity,
		data,
		aggregations,
	};
}

