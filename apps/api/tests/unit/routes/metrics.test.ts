/**
 * Unit Tests: Metrics Overview Handler
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * MVP Requirements:
 * - GET /v1/metrics/overview - response format validation
 * - Validate shape against OpenAPI types (Zod schemas)
 * - Multi-tenant isolation checks (placeholder for when auth is implemented)
 *
 * @see specs/openapi.mvp.v1.yaml - MetricsOverviewResponse schema
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Hono } from 'hono';
import metrics from '../../../src/routes/metrics';
import {
    MetricsOverviewResponseSchema,
    PeriodQuerySchema,
    MetricValueSchema,
    ErrorResponseSchema,
} from '../../../src/schemas';

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

// Create test app with metrics routes and mock auth
const app = new Hono();
app.use('/metrics/*', mockAuth);
app.route('/metrics', metrics);

// Helper to make requests to test app
async function request(path: string, options: RequestInit = {}): Promise<Response> {
    return app.request(path, options);
}

describe('GET /metrics/overview', () => {
    describe('Response Schema Validation (OpenAPI Contract)', () => {
        it('returns 200 with valid MetricsOverviewResponse schema', async () => {
            const response = await request('/metrics/overview?period=7d');

            expect(response.status).toBe(200);

            const body = await response.json();

            // Validate against OpenAPI schema using Zod
            const result = MetricsOverviewResponseSchema.safeParse(body);

            expect(result.success).toBe(true);
            if (!result.success) {
                console.error('Schema validation errors:', result.error.issues);
            }
        });

        it('response contains all required metrics fields per OpenAPI spec', async () => {
            const response = await request('/metrics/overview?period=7d&compare=true');
            const body = await response.json();

            // Required fields per OpenAPI MetricsOverviewResponse
            expect(body).toHaveProperty('period');
            expect(body).toHaveProperty('period.start');
            expect(body).toHaveProperty('period.end');
            expect(body).toHaveProperty('metrics');

            // Required metrics per OpenAPI spec
            expect(body.metrics).toHaveProperty('active_users');
            expect(body.metrics).toHaveProperty('total_sessions');
            expect(body.metrics).toHaveProperty('success_rate');
            expect(body.metrics).toHaveProperty('total_cost');

            // Each MetricValue must have 'value' field
            expect(body.metrics.active_users).toHaveProperty('value');
            expect(body.metrics.total_sessions).toHaveProperty('value');
            expect(body.metrics.success_rate).toHaveProperty('value');
            expect(body.metrics.total_cost).toHaveProperty('value');
        });

        it('each MetricValue matches OpenAPI MetricValue schema', async () => {
            const response = await request('/metrics/overview?period=7d&compare=true');
            const body = await response.json();

            // Validate each metric value against schema
            const metricsToCheck = ['active_users', 'total_sessions', 'success_rate', 'total_cost'];

            for (const metricName of metricsToCheck) {
                const metric = body.metrics[metricName];
                const result = MetricValueSchema.safeParse(metric);

                expect(result.success).toBe(true);
                if (!result.success) {
                    console.error(`${metricName} validation errors:`, result.error.issues);
                }
            }
        });

        it('period dates are valid ISO 8601 format', async () => {
            const response = await request('/metrics/overview?period=7d');
            const body = await response.json();

            // ISO 8601 datetime validation
            expect(() => new Date(body.period.start)).not.toThrow();
            expect(() => new Date(body.period.end)).not.toThrow();

            const start = new Date(body.period.start);
            const end = new Date(body.period.end);

            expect(start.toISOString()).toBe(body.period.start);
            expect(end.toISOString()).toBe(body.period.end);
            expect(start < end).toBe(true);
        });
    });

    describe('Query Parameter Handling', () => {
        it('accepts valid period values: 1d, 7d, 30d, 90d', async () => {
            const validPeriods = ['1d', '7d', '30d', '90d'];

            for (const period of validPeriods) {
                const response = await request(`/metrics/overview?period=${period}`);
                expect(response.status).toBe(200);
            }
        });

        it('defaults to 7d period when not specified', async () => {
            const response = await request('/metrics/overview');

            expect(response.status).toBe(200);

            const body = await response.json();
            const start = new Date(body.period.start);
            const end = new Date(body.period.end);

            // Should be approximately 7 days
            const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            expect(daysDiff).toBeCloseTo(7, 0);
        });

        it('returns 400 for invalid period value', async () => {
            const response = await request('/metrics/overview?period=invalid');

            expect(response.status).toBe(400);

            const body = await response.json();

            // Validate error response matches OpenAPI ErrorResponse schema
            expect(body).toHaveProperty('error');
            expect(body).toHaveProperty('request_id');
            expect(body.error).toHaveProperty('code', 'VAL_INVALID_FORMAT');
            expect(body.error).toHaveProperty('message');
            expect(body.error.details).toHaveProperty('field', 'period');
            expect(body.error.details).toHaveProperty('allowed');
        });

        it('includes comparison data when compare=true', async () => {
            const response = await request('/metrics/overview?period=7d&compare=true');
            const body = await response.json();

            // When compare=true, MetricValue should include previous/change_percent/trend
            expect(body.metrics.active_users).toHaveProperty('previous');
            expect(body.metrics.active_users).toHaveProperty('change_percent');
            expect(body.metrics.active_users).toHaveProperty('trend');

            // Trend must be valid enum value
            expect(['up', 'down', 'stable']).toContain(body.metrics.active_users.trend);
        });

        it('excludes comparison data when compare=false', async () => {
            const response = await request('/metrics/overview?period=7d&compare=false');
            const body = await response.json();

            // When compare=false, MetricValue should NOT include comparison fields
            expect(body.metrics.active_users).not.toHaveProperty('previous');
            expect(body.metrics.active_users).not.toHaveProperty('change_percent');
            expect(body.metrics.active_users).not.toHaveProperty('trend');
        });

        it('defaults compare to true when not specified', async () => {
            const response = await request('/metrics/overview?period=7d');
            const body = await response.json();

            // Default compare=true means comparison fields should be present
            expect(body.metrics.active_users).toHaveProperty('previous');
            expect(body.metrics.active_users).toHaveProperty('change_percent');
            expect(body.metrics.active_users).toHaveProperty('trend');
        });
    });

    describe('Response Headers (OpenAPI Compliance)', () => {
        it('includes rate limit headers', async () => {
            const response = await request('/metrics/overview');

            expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
            expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
            expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();

            // Values should be numeric strings
            expect(Number(response.headers.get('X-RateLimit-Limit'))).toBeGreaterThan(0);
            expect(Number(response.headers.get('X-RateLimit-Remaining'))).toBeGreaterThanOrEqual(0);
            expect(Number(response.headers.get('X-RateLimit-Reset'))).toBeGreaterThan(0);
        });

        it('includes cache-control header', async () => {
            const response = await request('/metrics/overview');

            const cacheControl = response.headers.get('Cache-Control');
            expect(cacheControl).toBeDefined();
            expect(cacheControl).toContain('private');
            expect(cacheControl).toContain('max-age=60');
        });

        it('returns application/json content type', async () => {
            const response = await request('/metrics/overview');

            const contentType = response.headers.get('Content-Type');
            expect(contentType).toContain('application/json');
        });
    });

    describe('Meta Information', () => {
        it('includes meta object with request tracking', async () => {
            const response = await request('/metrics/overview');
            const body = await response.json();

            expect(body).toHaveProperty('meta');
            expect(body.meta).toHaveProperty('request_id');
            expect(body.meta).toHaveProperty('cache_hit');
            expect(body.meta).toHaveProperty('cache_ttl');

            // request_id should be a non-empty string
            expect(typeof body.meta.request_id).toBe('string');
            expect(body.meta.request_id.length).toBeGreaterThan(0);

            // cache_ttl should match header max-age
            expect(body.meta.cache_ttl).toBe(60);
        });

        it('generates unique request_id for each request', async () => {
            const response1 = await request('/metrics/overview');
            const response2 = await request('/metrics/overview');

            const body1 = await response1.json();
            const body2 = await response2.json();

            expect(body1.meta.request_id).not.toBe(body2.meta.request_id);
        });
    });

    describe('Metrics Value Constraints', () => {
        it('active_users value is a non-negative integer', async () => {
            const response = await request('/metrics/overview');
            const body = await response.json();

            expect(typeof body.metrics.active_users.value).toBe('number');
            expect(body.metrics.active_users.value).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(body.metrics.active_users.value)).toBe(true);
        });

        it('total_sessions value is a non-negative integer', async () => {
            const response = await request('/metrics/overview');
            const body = await response.json();

            expect(typeof body.metrics.total_sessions.value).toBe('number');
            expect(body.metrics.total_sessions.value).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(body.metrics.total_sessions.value)).toBe(true);
        });

        it('success_rate is a percentage (0-100) with unit "percent"', async () => {
            const response = await request('/metrics/overview');
            const body = await response.json();

            expect(typeof body.metrics.success_rate.value).toBe('number');
            expect(body.metrics.success_rate.value).toBeGreaterThanOrEqual(0);
            expect(body.metrics.success_rate.value).toBeLessThanOrEqual(100);
            expect(body.metrics.success_rate.unit).toBe('percent');
        });

        it('total_cost is a non-negative number with unit "usd"', async () => {
            const response = await request('/metrics/overview');
            const body = await response.json();

            expect(typeof body.metrics.total_cost.value).toBe('number');
            expect(body.metrics.total_cost.value).toBeGreaterThanOrEqual(0);
            expect(body.metrics.total_cost.unit).toBe('usd');
        });
    });

    /**
     * Multi-Tenant Isolation Tests
     *
     * Per Testing Spec §4: Multi-tenant isolation is CRITICAL
     * These tests verify that metrics are scoped to the authenticated organization
     *
     * NOTE: Currently placeholders - will be implemented when auth middleware is added
     * The handler should extract org_id from JWT/API key and filter metrics accordingly
     */
    describe('Multi-Tenant Isolation (Placeholder)', () => {
        it.todo('returns 401 when no authentication provided');

        it.todo('returns 401 for invalid JWT token');

        it.todo('returns 401 for invalid API key');

        it.todo('metrics are scoped to authenticated organization');

        it.todo('org_id cannot be overridden via headers');

        it.todo('Org A cannot access Org B metrics via any means');
    });

    /**
     * Error Response Tests
     *
     * Per OpenAPI spec: All errors must match ErrorResponse schema
     */
    describe('Error Response Format', () => {
        it('error responses match OpenAPI ErrorResponse schema', async () => {
            const response = await request('/metrics/overview?period=invalid');

            expect(response.status).toBe(400);

            const body = await response.json();
            const result = ErrorResponseSchema.safeParse(body);

            expect(result.success).toBe(true);
            if (!result.success) {
                console.error('Error response validation:', result.error.issues);
            }
        });

        it('error response includes request_id for debugging', async () => {
            const response = await request('/metrics/overview?period=invalid');
            const body = await response.json();

            expect(body).toHaveProperty('request_id');
            expect(typeof body.request_id).toBe('string');
            expect(body.request_id.length).toBeGreaterThan(0);
        });
    });
});
