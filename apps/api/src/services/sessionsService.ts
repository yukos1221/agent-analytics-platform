/**
 * Sessions Service
 *
 * Provides session list and detail functionality.
 *
 * @see docs/03-api-specification-v1.2.md Section 6.3 - Sessions API
 * @see specs/openapi.mvp.v1.yaml - SessionListResponse, SessionDetailResponse schemas
 */

import { eventStore, type StoredEvent } from './index';
import {
	querySessionsByOrgRange,
	queryEventsByOrgRange,
} from '../../../../packages/database/src';
import type {
	SessionListQuery,
	SessionSummary,
	SessionDetailResponse,
	SessionStatus,
} from '../schemas';

/**
 * Calculate session metrics from events
 */
function calculateSessionMetrics(events: StoredEvent[]): {
	tasks_completed: number;
	tasks_failed: number;
	tasks_cancelled: number;
	tokens_input: number;
	tokens_output: number;
	estimated_cost: number;
	avg_task_duration_ms?: number;
} {
	let tasks_completed = 0;
	let tasks_failed = 0;
	let tasks_cancelled = 0;
	let tokens_input = 0;
	let tokens_output = 0;
	const taskDurations: number[] = [];

	for (const event of events) {
		// Count task events (using correct event types from OpenAPI spec)
		if (event.event_type === 'task_complete') {
			tasks_completed++;
			// Extract task duration if available
			const duration = (event.metadata as { duration_ms?: number })
				?.duration_ms;
			if (duration) {
				taskDurations.push(duration);
			}
		} else if (event.event_type === 'task_error') {
			tasks_failed++;
		} else if (event.event_type === 'task_cancel') {
			tasks_cancelled++;
		}

		// Aggregate tokens
		const metadata = event.metadata as {
			tokens_input?: number;
			tokens_output?: number;
		};
		if (metadata?.tokens_input) {
			tokens_input += metadata.tokens_input;
		}
		if (metadata?.tokens_output) {
			tokens_output += metadata.tokens_output;
		}
	}

	// Calculate estimated cost (simplified: $0.00001 per input token, $0.00003 per output token)
	const estimated_cost = tokens_input * 0.00001 + tokens_output * 0.00003;

	// Calculate average task duration
	const avg_task_duration_ms =
		taskDurations.length > 0
			? Math.round(
				taskDurations.reduce((sum, d) => sum + d, 0) / taskDurations.length
			)
			: undefined;

	return {
		tasks_completed,
		tasks_failed,
		tasks_cancelled,
		tokens_input,
		tokens_output,
		estimated_cost,
		avg_task_duration_ms,
	};
}

/**
 * Get session list with pagination and filtering
 */
export async function listSessions(
	orgId: string,
	query: SessionListQuery
): Promise<{
	data: SessionSummary[];
	pagination: {
		cursor: string | null;
		has_more: boolean;
	};
}> {
	// Parse date filters
	const startTime = query.start_time ? new Date(query.start_time) : undefined;
	const endTime = query.end_time ? new Date(query.end_time) : undefined;

	// Default to last 90 days if no time range specified (to catch all sessions)
	const defaultEnd = new Date();
	const defaultStart = new Date(
		defaultEnd.getTime() - 90 * 24 * 60 * 60 * 1000
	);

	const filterStart = startTime || defaultStart;
	const filterEnd = endTime || defaultEnd;

	// Query sessions from database (fallback to in-memory events)
	type SessionRow = {
		id: string;
		org_id: string;
		user_id: string;
		agent_id: string;
		status: string;
		started_at: Date | string;
		ended_at: Date | string | null;
		duration_ms: number | null;
	};

	let sessionsRows: SessionRow[] = [];

	const dbSessions = await querySessionsByOrgRange(
		orgId,
		filterStart,
		filterEnd
	);
	if (dbSessions !== null && Array.isArray(dbSessions)) {
		// Type assertion for database rows (postgres returns RowList)
		sessionsRows = dbSessions as unknown as SessionRow[];
	} else {
		// Fallback: derive sessions from events
		const allEvents = eventStore.getByOrg(orgId);
		const sessionMap = new Map<string, StoredEvent[]>();

		// Group all events by session (don't filter by time here - we'll filter sessions later)
		for (const event of allEvents) {
			if (!sessionMap.has(event.session_id)) {
				sessionMap.set(event.session_id, []);
			}
			sessionMap.get(event.session_id)!.push(event);
		}

		// Convert events to session-like rows
		for (const [sessionId, events] of sessionMap.entries()) {
			if (events.length === 0) continue;

			// Sort events by timestamp to ensure correct order
			const sortedEvents = [...events].sort(
				(a, b) =>
					new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
			);

			const firstEvent = sortedEvents[0];
			const startedAt = new Date(firstEvent.timestamp);

			// Check if session has ended (look for session_end event anywhere in the sequence)
			const sessionEndEvent = sortedEvents.find(
				(e) => e.event_type === 'session_end'
			);
			const endedAt = sessionEndEvent
				? new Date(sessionEndEvent.timestamp)
				: null;

			// Determine status: check if session has ended and if there were errors
			let status: 'active' | 'completed' | 'error' = 'active';
			if (sessionEndEvent) {
				// Session has ended - check if there were errors
				const hasError = sortedEvents.some(
					(e) => e.event_type === 'error' || e.event_type === 'task_error'
				);
				status = hasError ? 'error' : 'completed';
			}

			// Filter sessions by started_at time range
			const sessionStartTime = startedAt.getTime();
			if (
				sessionStartTime >= filterStart.getTime() &&
				sessionStartTime <= filterEnd.getTime()
			) {
				sessionsRows.push({
					id: sessionId,
					org_id: orgId,
					user_id: firstEvent.user_id,
					agent_id: firstEvent.agent_id,
					status,
					started_at: startedAt,
					ended_at: endedAt,
					duration_ms: endedAt ? endedAt.getTime() - startedAt.getTime() : null,
				});
			}
		}
	}

	// Apply filters
	let filteredSessions = sessionsRows;

	if (query.status) {
		filteredSessions = filteredSessions.filter(
			(s) => s.status === query.status
		);
	}

	if (query.agent_id) {
		filteredSessions = filteredSessions.filter(
			(s) => s.agent_id === query.agent_id
		);
	}

	if (query.user_id) {
		filteredSessions = filteredSessions.filter(
			(s) => s.user_id === query.user_id
		);
	}

	// Sort sessions
	const sortField = query.sort.startsWith('-')
		? query.sort.slice(1)
		: query.sort;
	const sortDesc = query.sort.startsWith('-');

	filteredSessions.sort((a, b) => {
		let comparison = 0;

		if (sortField === 'started_at') {
			const aTime =
				a.started_at instanceof Date
					? a.started_at.getTime()
					: new Date(a.started_at).getTime();
			const bTime =
				b.started_at instanceof Date
					? b.started_at.getTime()
					: new Date(b.started_at).getTime();
			comparison = aTime - bTime;
		} else if (sortField === 'duration') {
			const aDuration = a.duration_ms ?? 0;
			const bDuration = b.duration_ms ?? 0;
			comparison = aDuration - bDuration;
		}

		return sortDesc ? -comparison : comparison;
	});

	// Pagination
	const limit = query.limit || 25;
	const cursorIndex = query.cursor
		? filteredSessions.findIndex((s) => s.id === query.cursor)
		: -1;
	const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
	const paginatedSessions = filteredSessions.slice(
		startIndex,
		startIndex + limit
	);

	// Get events for each session to calculate metrics
	const allEvents = eventStore.getByOrg(orgId);
	const sessionEventsMap = new Map<string, StoredEvent[]>();

	for (const event of allEvents) {
		if (!sessionEventsMap.has(event.session_id)) {
			sessionEventsMap.set(event.session_id, []);
		}
		sessionEventsMap.get(event.session_id)!.push(event);
	}

	// Build response
	const data: SessionSummary[] = paginatedSessions.map((session) => {
		const events = sessionEventsMap.get(session.id) || [];
		const metrics = calculateSessionMetrics(events);

		return {
			session_id: session.id,
			user_id: session.user_id,
			agent_id: session.agent_id,
			environment: 'production' as const, // Default for MVP
			status: session.status as SessionStatus,
			started_at:
				session.started_at instanceof Date
					? session.started_at.toISOString()
					: new Date(session.started_at).toISOString(),
			ended_at:
				session.ended_at instanceof Date
					? session.ended_at.toISOString()
					: session.ended_at
					? new Date(session.ended_at).toISOString()
					: null,
			duration_seconds: session.duration_ms
				? Math.floor(session.duration_ms / 1000)
				: null,
			metrics: {
				tasks_completed: metrics.tasks_completed,
				tasks_failed: metrics.tasks_failed,
				tokens_used: metrics.tokens_input + metrics.tokens_output,
				estimated_cost: metrics.estimated_cost,
			},
		};
	});

	const nextCursor =
		startIndex + limit < filteredSessions.length
			? paginatedSessions[paginatedSessions.length - 1]?.id || null
			: null;

	return {
		data,
		pagination: {
			cursor: nextCursor,
			has_more: startIndex + limit < filteredSessions.length,
		},
	};
}

/**
 * Get session detail with full metrics and timeline
 */
export async function getSessionDetail(
	orgId: string,
	sessionId: string
): Promise<SessionDetailResponse | null> {
	// Query session from database
	const dbSessions = await querySessionsByOrgRange(
		orgId,
		new Date(0), // Start from epoch
		new Date() // End at now
	);

	type SessionRow = {
		id: string;
		org_id: string;
		user_id: string;
		agent_id: string;
		status: string;
		started_at: Date | string;
		ended_at: Date | string | null;
		duration_ms: number | null;
	};

	let sessionRow: SessionRow | undefined;

	if (dbSessions !== null && Array.isArray(dbSessions)) {
		sessionRow = (dbSessions as unknown as SessionRow[]).find(
			(s) => s.id === sessionId
		);
	}

	// If not found in DB, try to derive from events
	if (!sessionRow) {
		const allEvents = eventStore.getByOrg(orgId);
		const sessionEvents = allEvents.filter(
			(e: StoredEvent) => e.session_id === sessionId
		);

		if (sessionEvents.length === 0) {
			return null; // Session not found
		}

		const firstEvent = sessionEvents[0];
		const lastEvent = sessionEvents[sessionEvents.length - 1];

		const startedAt = new Date(firstEvent.timestamp);
		const endedAt =
			lastEvent.event_type === 'session_end'
				? new Date(lastEvent.timestamp)
				: null;

		// Determine status: check if session has ended and if there were errors
		let status: 'active' | 'completed' | 'error' = 'active';
		if (endedAt) {
			// Check if any event is an error
			const hasError = sessionEvents.some(
				(e) => e.event_type === 'error' || e.event_type === 'task_error'
			);
			status = hasError ? 'error' : 'completed';
		}

		sessionRow = {
			id: sessionId,
			org_id: orgId,
			user_id: firstEvent.user_id,
			agent_id: firstEvent.agent_id,
			status,
			started_at: startedAt,
			ended_at: endedAt,
			duration_ms: endedAt ? endedAt.getTime() - startedAt.getTime() : null,
		};
	}

	// Get all events for this session
	let sessionEvents: StoredEvent[] = [];
	const dbEvents = await queryEventsByOrgRange(orgId, new Date(0), new Date());

	if (dbEvents !== null && Array.isArray(dbEvents)) {
		sessionEvents = dbEvents
			.filter((e) => e.session_id === sessionId)
			.map(
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
		sessionEvents = eventStore
			.getByOrg(orgId)
			.filter((e: StoredEvent) => e.session_id === sessionId);
	}

	// Calculate detailed metrics
	const metrics = calculateSessionMetrics(sessionEvents);

	// Build timeline
	const timeline = {
		event_count: sessionEvents.length,
		first_event:
			sessionEvents.length > 0
				? new Date(sessionEvents[0].timestamp).toISOString()
				: undefined,
		last_event:
			sessionEvents.length > 0
				? new Date(
					sessionEvents[sessionEvents.length - 1].timestamp
				).toISOString()
				: undefined,
	};

	// Extract client info from metadata if available
	const clientInfo = sessionEvents.find(
		(e) => e.metadata && typeof e.metadata === 'object'
	)?.metadata as
		| {
				client_info?: {
					ide?: string;
					ide_version?: string;
					os?: string;
				os_version?: string;
			};
		}
		| undefined;

	return {
		session_id: sessionRow.id,
		user_id: sessionRow.user_id,
		agent_id: sessionRow.agent_id,
		environment: 'production' as const,
		status: sessionRow.status as SessionStatus,
		started_at:
			sessionRow.started_at instanceof Date
				? sessionRow.started_at.toISOString()
				: new Date(sessionRow.started_at).toISOString(),
		ended_at:
			sessionRow.ended_at instanceof Date
				? sessionRow.ended_at.toISOString()
				: sessionRow.ended_at
				? new Date(sessionRow.ended_at).toISOString()
				: null,
		duration_seconds: sessionRow.duration_ms
			? Math.floor(sessionRow.duration_ms / 1000)
			: null,
		metrics: {
			tasks_completed: metrics.tasks_completed,
			tasks_failed: metrics.tasks_failed,
			tasks_cancelled: metrics.tasks_cancelled,
			tokens_input: metrics.tokens_input,
			tokens_output: metrics.tokens_output,
			estimated_cost: metrics.estimated_cost,
			avg_task_duration_ms: metrics.avg_task_duration_ms,
		},
		timeline,
		client_info: clientInfo?.client_info
			? {
					ide: clientInfo.client_info.ide,
					ide_version: clientInfo.client_info.ide_version,
					os: clientInfo.client_info.os,
					os_version: clientInfo.client_info.os_version,
			}
			: undefined,
	};
}


