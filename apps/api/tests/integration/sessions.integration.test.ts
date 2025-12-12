/**
 * Integration Tests: Sessions Endpoints
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * - Section 1.5: MVP Test Suite - "Sessions list and detail"
 * - Section 3.3: Integration Tests
 *
 * These tests verify the full flow:
 * 1. Ingest events via POST /v1/events
 * 2. Query sessions via GET /v1/sessions
 * 3. Query session detail via GET /v1/sessions/{id}
 * 4. Verify responses match OpenAPI spec
 *
 * Per Testing Spec: "Multi-tenant isolation" and "Data correctness"
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import app from '../../src/app';
import { eventStore } from '../../src/services';
import {
	API_KEYS,
	createEvent,
	generateSessionId,
	createSessionEvents,
} from '../fixtures/events';
import {
	SessionListResponseSchema,
	SessionDetailResponseSchema,
	ErrorResponseSchema,
} from '../../src/schemas';

/**
 * The sessions endpoint uses this org_id for MVP (hardcoded until JWT auth is implemented)
 */
const SESSIONS_ORG_ID = 'org_default';

/**
 * Helper to make API requests
 */
async function apiRequest(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return app.request(path, options);
}

/**
 * Helper to POST events via API (uses org from API key)
 */
async function postEventsViaApi(events: unknown[]): Promise<Response> {
	return apiRequest('/v1/events', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': API_KEYS.ORG_A,
		},
		body: JSON.stringify({ events }),
	});
}

/**
 * Helper to seed events directly into the store under the sessions org
 */
async function seedEvents(events: unknown[]): Promise<void> {
	await eventStore.ingest(
		SESSIONS_ORG_ID,
		events as ReturnType<typeof createEvent>[]
	);
}

/**
 * Helper to GET sessions list
 */
async function getSessionsList(
	params: {
		status?: string;
		agent_id?: string;
		user_id?: string;
		start_time?: string;
		end_time?: string;
		limit?: number;
		cursor?: string;
		sort?: string;
	} = {}
): Promise<Response> {
	const queryParams = new URLSearchParams();
	if (params.status) queryParams.set('status', params.status);
	if (params.agent_id) queryParams.set('agent_id', params.agent_id);
	if (params.user_id) queryParams.set('user_id', params.user_id);
	if (params.start_time) queryParams.set('start_time', params.start_time);
	if (params.end_time) queryParams.set('end_time', params.end_time);
	if (params.limit) queryParams.set('limit', params.limit.toString());
	if (params.cursor) queryParams.set('cursor', params.cursor);
	if (params.sort) queryParams.set('sort', params.sort);

	return apiRequest(`/v1/sessions?${queryParams.toString()}`);
}

/**
 * Helper to GET session detail
 */
async function getSessionDetail(sessionId: string): Promise<Response> {
	return apiRequest(`/v1/sessions/${sessionId}`);
}

describe('Sessions API Integration Tests', () => {
	beforeEach(() => {
		eventStore.clear();
	});

	afterEach(() => {
		eventStore.clear();
	});

	describe('GET /v1/sessions', () => {
		it('returns empty list when no sessions exist', async () => {
			const response = await getSessionsList();
			expect(response.status).toBe(200);

			const body = await response.json();
			const result = SessionListResponseSchema.safeParse(body);
			expect(result.success).toBe(true);

			expect(body.data).toEqual([]);
			expect(body.pagination.has_more).toBe(false);
		});

		it('returns sessions after ingesting events', async () => {
			const sessionId = generateSessionId();
			const events = createSessionEvents(sessionId);
			await seedEvents(events);

			const response = await getSessionsList();
			expect(response.status).toBe(200);

			const body = await response.json();
			const result = SessionListResponseSchema.safeParse(body);
			expect(result.success).toBe(true);

			expect(body.data.length).toBeGreaterThan(0);
			const session = body.data.find(
				(s: { session_id: string }) => s.session_id === sessionId
			);
			expect(session).toBeDefined();
			expect(session.status).toBe('completed');
		});

		it('filters sessions by status', async () => {
			const activeSessionId = generateSessionId();
			const completedSessionId = generateSessionId();

			// Create active session (no session_end event)
			const activeEvents = [
				createEvent({
					session_id: activeSessionId,
					event_type: 'session_start',
					timestamp: new Date().toISOString(),
				}),
			];

			// Create completed session
			const completedEvents = createSessionEvents(completedSessionId);

			await seedEvents(activeEvents);
			await seedEvents(completedEvents);

			// Filter by completed
			const completedResponse = await getSessionsList({ status: 'completed' });
			const completedBody = await completedResponse.json();

			expect(completedBody.data.length).toBeGreaterThan(0);
			for (const session of completedBody.data) {
				expect(session.status).toBe('completed');
			}

			// Filter by active
			const activeResponse = await getSessionsList({ status: 'active' });
			const activeBody = await activeResponse.json();

			expect(activeBody.data.length).toBeGreaterThan(0);
			for (const session of activeBody.data) {
				expect(session.status).toBe('active');
			}
		});

		it('filters sessions by agent_id', async () => {
			const sessionId1 = generateSessionId();
			const sessionId2 = generateSessionId();

			const events1 = createSessionEvents(sessionId1).map((e) => ({
				...e,
				agent_id: 'agent_claude_code',
			}));
			const events2 = createSessionEvents(sessionId2).map((e) => ({
				...e,
				agent_id: 'agent_gpt4',
			}));

			await seedEvents(events1);
			await seedEvents(events2);

			const response = await getSessionsList({ agent_id: 'agent_claude_code' });
			const body = await response.json();

			expect(body.data.length).toBeGreaterThan(0);
			for (const session of body.data) {
				expect(session.agent_id).toBe('agent_claude_code');
			}
		});

		it('supports pagination with limit and cursor', async () => {
			// Create multiple sessions
			const sessions: string[] = [];
			for (let i = 0; i < 5; i++) {
				const sessionId = generateSessionId();
				const events = createSessionEvents(sessionId);
				await seedEvents(events);
				sessions.push(sessionId);
			}

			// First page
			const response1 = await getSessionsList({ limit: 2 });
			const body1 = await response1.json();

			expect(body1.data.length).toBeLessThanOrEqual(2);
			expect(body1.pagination.has_more).toBe(true);

			// Second page using cursor
			if (body1.pagination.cursor) {
				const response2 = await getSessionsList({
					limit: 2,
					cursor: body1.pagination.cursor,
				});
				const body2 = await response2.json();

				expect(body2.data.length).toBeGreaterThan(0);
				// Ensure no duplicate sessions
				const allSessionIds = [
					...body1.data.map((s: { session_id: string }) => s.session_id),
					...body2.data.map((s: { session_id: string }) => s.session_id),
				];
				const uniqueIds = new Set(allSessionIds);
				expect(uniqueIds.size).toBe(allSessionIds.length);
			}
		});

		it('sorts sessions by started_at descending by default', async () => {
			const sessionId1 = generateSessionId();
			const sessionId2 = generateSessionId();

			const now = Date.now();
			const events1 = createSessionEvents(sessionId1).map((e, i) => ({
				...e,
				timestamp: new Date(now - 10000 + i * 1000).toISOString(), // Older
			}));
			const events2 = createSessionEvents(sessionId2).map((e, i) => ({
				...e,
				timestamp: new Date(now + i * 1000).toISOString(), // Newer
			}));

			await seedEvents(events1);
			await seedEvents(events2);

			const response = await getSessionsList();
			const body = await response.json();

			expect(body.data.length).toBeGreaterThanOrEqual(2);
			// Newer session should come first (descending order)
			const sessionIds = body.data.map(
				(s: { session_id: string }) => s.session_id
			);
			expect(sessionIds.indexOf(sessionId2)).toBeLessThan(
				sessionIds.indexOf(sessionId1)
			);
		});
	});

	describe('GET /v1/sessions/{session_id}', () => {
		it('returns 404 for non-existent session', async () => {
			const nonExistentId = 'sess_0000000000000000000000000';

			const response = await getSessionDetail(nonExistentId);
			expect(response.status).toBe(404);

			const body = await response.json();
			const result = ErrorResponseSchema.safeParse(body);
			expect(result.success).toBe(true);
			expect(body.error.code).toBe('RES_NOT_FOUND');
		});

		it('returns session detail with metrics', async () => {
			const sessionId = generateSessionId();
			const events = [
				...createSessionEvents(sessionId),
				createEvent({
					session_id: sessionId,
					event_type: 'task_completed',
					metadata: {
						tokens_input: 1000,
						tokens_output: 2000,
						duration_ms: 5000,
					},
				}),
				createEvent({
					session_id: sessionId,
					event_type: 'task_failed',
				}),
			];

			await seedEvents(events);

			const response = await getSessionDetail(sessionId);
			expect(response.status).toBe(200);

			const body = await response.json();
			const result = SessionDetailResponseSchema.safeParse(body);
			expect(result.success).toBe(true);

			expect(body.session_id).toBe(sessionId);
			expect(body).toHaveProperty('metrics');
			expect(body.metrics.tasks_completed).toBeGreaterThan(0);
			expect(body.metrics.tokens_input).toBeGreaterThan(0);
			expect(body.metrics.estimated_cost).toBeGreaterThan(0);
		});

		it('includes timeline metadata in detail response', async () => {
			const sessionId = generateSessionId();
			const events = createSessionEvents(sessionId);
			await seedEvents(events);

			const response = await getSessionDetail(sessionId);
			const body = await response.json();

			expect(body).toHaveProperty('timeline');
			expect(body.timeline.event_count).toBeGreaterThan(0);
			expect(body.timeline.first_event).toBeDefined();
			expect(body.timeline.last_event).toBeDefined();
		});

		it('calculates duration correctly for completed sessions', async () => {
			const sessionId = generateSessionId();
			const startTime = new Date('2025-12-09T10:30:00.000Z');
			const endTime = new Date('2025-12-09T11:15:00.000Z');

			const events = [
				createEvent({
					session_id: sessionId,
					event_type: 'session_start',
					timestamp: startTime.toISOString(),
				}),
				createEvent({
					session_id: sessionId,
					event_type: 'session_end',
					timestamp: endTime.toISOString(),
				}),
			];

			await seedEvents(events);

			const response = await getSessionDetail(sessionId);
			const body = await response.json();

			expect(body.duration_seconds).toBe(2700); // 45 minutes = 2700 seconds
			expect(body.ended_at).toBe(endTime.toISOString());
		});
	});

	describe('Multi-tenant isolation', () => {
		it('only returns sessions for the authenticated org', async () => {
			// Seed sessions for different orgs
			const orgASessionId = generateSessionId();
			const orgBSessionId = generateSessionId();

			const orgAEvents = createSessionEvents(orgASessionId);
			const orgBEvents = createSessionEvents(orgBSessionId);

			await eventStore.ingest('org_a', orgAEvents);
			await eventStore.ingest('org_b', orgBEvents);
			await seedEvents(orgAEvents); // Also seed to org_default

			// Query with org_default context (MVP uses org_default)
			const response = await getSessionsList();
			const body = await response.json();

			// Should only see sessions from org_default
			const sessionIds = body.data.map(
				(s: { session_id: string }) => s.session_id
			);
			expect(sessionIds).toContain(orgASessionId);
			expect(sessionIds).not.toContain(orgBSessionId);
		});
	});
});
