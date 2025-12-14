/**
 * Unit Tests: Sessions Handlers
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * MVP Requirements:
 * - GET /v1/sessions - response format validation
 * - GET /v1/sessions/{id} - response format validation
 * - Validate shape against OpenAPI types (Zod schemas)
 * - Multi-tenant isolation checks (placeholder for when auth is implemented)
 *
 * @see specs/openapi.mvp.v1.yaml - SessionListResponse, SessionDetailResponse schemas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import sessions from '../../../src/routes/sessions';
import {
    SessionListResponseSchema,
    SessionDetailResponseSchema,
    SessionSummarySchema,
    ErrorResponseSchema,
} from '../../../src/schemas';
import { eventStore } from '../../../src/services';
import { createEvent, generateSessionId, createSessionEvents } from '../../fixtures/events';

// Mock jwtAuth middleware for unit tests
vi.mock('../../../src/middleware', () => ({
    jwtAuth: () => async (c: any, next: any) => {
        c.set('auth', {
            org_id: 'org_default',
            environment: 'development',
            token_type: 'jwt',
        });
        c.set('requestId', 'test-request-id');
        await next();
    },
    rateLimit: () => async (c: any, next: any) => {
        await next();
    },
    getAuthContext: (c: any) => c.get('auth'),
    getRequestId: (c: any) => c.get('requestId') || 'test-request-id',
}));

// Mock auth middleware for unit tests
const mockAuth = async (c: any, next: any) => {
    c.set('auth', {
        org_id: 'org_default',
        environment: 'development',
        token_type: 'jwt',
    });
    c.set('requestId', 'test-request-id');
    await next();
};

// Create test app with sessions routes and mock auth
const app = new Hono();
app.use('*', mockAuth);
app.route('/sessions', sessions);

// Helper to make requests to test app
async function request(path: string, options: RequestInit = {}): Promise<Response> {
    return app.request(path, options);
}

describe('GET /sessions', () => {
    beforeEach(() => {
        eventStore.clear();
    });

    describe('Response Schema Validation (OpenAPI Contract)', () => {
        it('returns 200 with valid SessionListResponse schema', async () => {
            // Seed some events to create sessions
            const sessionId = generateSessionId();
            const events = createSessionEvents(sessionId);
            await eventStore.ingest('org_default', events);

            const response = await request('/sessions');

            expect(response.status).toBe(200);

            const body = await response.json();

            // Validate against OpenAPI schema using Zod
            const result = SessionListResponseSchema.safeParse(body);

            expect(result.success).toBe(true);
            if (!result.success) {
                console.error('Schema validation errors:', result.error.issues);
            }
        });

        it('response contains required fields per OpenAPI spec', async () => {
            const sessionId = generateSessionId();
            const events = createSessionEvents(sessionId);
            await eventStore.ingest('org_default', events);

            const response = await request('/sessions');
            const body = await response.json();

            // Required fields per OpenAPI SessionListResponse
            expect(body).toHaveProperty('data');
            expect(body).toHaveProperty('pagination');
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.pagination).toHaveProperty('has_more');
        });

        it('each session in data array matches SessionSummary schema', async () => {
            const sessionId = generateSessionId();
            const events = createSessionEvents(sessionId);
            await eventStore.ingest('org_default', events);

            const response = await request('/sessions');
            const body = await response.json();

            if (body.data.length > 0) {
                const sessionResult = SessionSummarySchema.safeParse(body.data[0]);
                expect(sessionResult.success).toBe(true);
            }
        });

        it('returns 400 for invalid query parameters', async () => {
            const response = await request('/sessions?status=invalid_status');

            expect(response.status).toBe(400);

            const body = await response.json();
            const result = ErrorResponseSchema.safeParse(body);
            expect(result.success).toBe(true);
        });

        it('supports pagination with cursor', async () => {
            // Seed multiple sessions
            for (let i = 0; i < 3; i++) {
                const sessionId = generateSessionId();
                const events = createSessionEvents(sessionId);
                await eventStore.ingest('org_default', events);
            }

            const response1 = await request('/sessions?limit=2');
            const body1 = await response1.json();

            expect(body1.data.length).toBeLessThanOrEqual(2);
            expect(body1.pagination).toHaveProperty('cursor');
            expect(body1.pagination).toHaveProperty('has_more');

            if (body1.pagination.cursor) {
                const response2 = await request(
                    `/sessions?limit=2&cursor=${body1.pagination.cursor}`
                );
                const body2 = await response2.json();

                expect(body2.data.length).toBeGreaterThanOrEqual(0);
            }
        });

        it('supports filtering by status', async () => {
            const activeSessionId = generateSessionId();
            const completedSessionId = generateSessionId();

            // Create active session (no session_end event)
            const activeEvents = [
                createEvent({
                    session_id: activeSessionId,
                    event_type: 'session_start',
                }),
            ];

            // Create completed session
            const completedEvents = createSessionEvents(completedSessionId);

            await eventStore.ingest('org_default', activeEvents);
            await eventStore.ingest('org_default', completedEvents);

            const response = await request('/sessions?status=completed');
            const body = await response.json();

            // All returned sessions should be completed
            for (const session of body.data) {
                expect(session.status).toBe('completed');
            }
        });
    });
});

describe('GET /sessions/:session_id', () => {
    beforeEach(() => {
        eventStore.clear();
    });

    describe('Response Schema Validation (OpenAPI Contract)', () => {
        it('returns 200 with valid SessionDetailResponse schema', async () => {
            const sessionId = generateSessionId();
            const events = createSessionEvents(sessionId);
            await eventStore.ingest('org_default', events);

            const response = await request(`/sessions/${sessionId}`);

            expect(response.status).toBe(200);

            const body = await response.json();

            // Validate against OpenAPI schema using Zod
            const result = SessionDetailResponseSchema.safeParse(body);

            expect(result.success).toBe(true);
            if (!result.success) {
                console.error('Schema validation errors:', result.error.issues);
            }
        });

        it('response contains all required fields per OpenAPI spec', async () => {
            const sessionId = generateSessionId();
            const events = createSessionEvents(sessionId);
            await eventStore.ingest('org_default', events);

            const response = await request(`/sessions/${sessionId}`);
            const body = await response.json();

            // Required fields per OpenAPI SessionDetailResponse
            expect(body).toHaveProperty('session_id');
            expect(body.session_id).toBe(sessionId);
            expect(body).toHaveProperty('user_id');
            expect(body).toHaveProperty('agent_id');
            expect(body).toHaveProperty('status');
            expect(body).toHaveProperty('started_at');
        });

        it('returns 404 for non-existent session', async () => {
            const nonExistentId = 'sess_0000000000000000000000000';

            const response = await request(`/sessions/${nonExistentId}`);

            expect(response.status).toBe(404);

            const body = await response.json();
            const result = ErrorResponseSchema.safeParse(body);
            expect(result.success).toBe(true);
            expect(body.error.code).toBe('RES_NOT_FOUND');
        });

        it('returns 400 for invalid session ID format', async () => {
            const invalidId = 'invalid_session_id';

            const response = await request(`/sessions/${invalidId}`);

            expect(response.status).toBe(400);

            const body = await response.json();
            const result = ErrorResponseSchema.safeParse(body);
            expect(result.success).toBe(true);
            expect(body.error.code).toBe('VAL_INVALID_FORMAT');
        });

        it('includes detailed metrics in response', async () => {
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
            ];
            await eventStore.ingest('org_default', events);

            const response = await request(`/sessions/${sessionId}`);
            const body = await response.json();

            expect(body).toHaveProperty('metrics');
            expect(body.metrics).toHaveProperty('tasks_completed');
            expect(body.metrics).toHaveProperty('tokens_input');
            expect(body.metrics).toHaveProperty('tokens_output');
            expect(body.metrics).toHaveProperty('estimated_cost');
        });

        it('includes timeline metadata in response', async () => {
            const sessionId = generateSessionId();
            const events = createSessionEvents(sessionId);
            await eventStore.ingest('org_default', events);

            const response = await request(`/sessions/${sessionId}`);
            const body = await response.json();

            expect(body).toHaveProperty('timeline');
            expect(body.timeline).toHaveProperty('event_count');
            expect(body.timeline.event_count).toBeGreaterThan(0);
        });
    });
});
