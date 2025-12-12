import { Hono } from 'hono';
import {
	PeriodQuerySchema,
	MetricsOverviewResponse,
	generateRequestId,
	ErrorResponse,
} from '../schemas';
import { jwtAuth, getAuthContext, rateLimit } from '../middleware';
import { computeMetricsOverview } from '../services';
import { getOrSetCachedMetrics } from '../lib/cache/metricsCache';

const metrics = new Hono();

/**
 * GET /metrics/overview
 * Get dashboard overview metrics
 *
 * OpenAPI: operationId: getMetricsOverview
 * Spec: specs/openapi.mvp.v1.yaml lines 177-231
 * Docs: docs/03-api-specification-v1.2.md Section 6.2
 *
 * Authentication: BearerAuth (JWT) - for MVP, we accept any request
 * TODO: Phase 2 - Add JWT validation via middleware
 *
 * Query Parameters:
 * - period: Time period for metrics (1d|7d|30d|90d, default: 7d)
 * - compare: Include comparison with previous period (boolean, default: true)
 *
 * Response:
 * - 200 OK: MetricsOverviewResponse with computed metrics
 * - 400 Bad Request: Invalid query parameters
 * - 401 Unauthorized: Missing or invalid auth (Phase 2)
 * - 429 Rate Limit Exceeded: Too many requests
 * - 500 Internal Error: Server error
 *
 * MVP P0 Metrics (per docs/01-product-requirements.md Section 3):
 * - active_users: Daily/Weekly Active Users (unique users per period)
 * - total_sessions: Total Agent Sessions (completed + running + failed)
 * - success_rate: Session Success Rate (completed / total × 100%)
 * - total_cost: Total Spend (estimated from tokens)
 *
 * MVP Optional Metrics:
 * - avg_session_duration: Average execution time per session
 * - error_count: Number of error events
 */
// Protect metrics routes with JWT auth (keep /health public)
metrics.use('*', jwtAuth());
// Apply org-scoped rate limit: 100 requests per 60s (MVP). Replace with Redis in Phase 2.
metrics.use('*', rateLimit({ scope: 'org', limit: 100, windowSeconds: 60 }));

metrics.get('/overview', async (c) => {
	const requestId = generateRequestId();

	// Parse and validate query parameters
	const periodParam = c.req.query('period') || '7d';
	const compareParam = c.req.query('compare') !== 'false'; // default true

	// Validate period parameter against OpenAPI enum
	const periodResult = PeriodQuerySchema.safeParse(periodParam);
	if (!periodResult.success) {
		const response: ErrorResponse = {
			error: {
				code: 'VAL_INVALID_FORMAT',
				message: 'Invalid query parameter format',
				details: {
					field: 'period',
					received: periodParam,
					allowed: ['1d', '7d', '30d', '90d'],
				},
			},
			request_id: requestId,
		};
		return c.json(response, 400);
	}

	const period = periodResult.data;

	try {
		// Extract org_id from JWT auth context (set by jwtAuth)
		const auth = getAuthContext(c);
		const orgId = auth?.org_id || 'org_default';

		// Compute metrics (with caching)
		// Cache TTL should match Cache-Control max-age (60 seconds)
		// Allow override via env var for testing
		const cacheTtlSeconds =
			Number(process.env.METRICS_CACHE_TTL_MS || '60000') / 1000;
		const ttlMs = cacheTtlSeconds * 1000;
		const cacheKey = `metrics:${orgId}:period=${period}:compare=${compareParam}`;

		const { value: metricsData, cacheHit } = await getOrSetCachedMetrics(
			cacheKey,
			ttlMs,
			() => computeMetricsOverview(orgId, period, compareParam)
		);

		// Build response matching OpenAPI MetricsOverviewResponse schema exactly
		const response: MetricsOverviewResponse = {
			period: metricsData.period,
			metrics: metricsData.metrics,
			meta: {
				cache_hit: cacheHit,
				cache_ttl: cacheTtlSeconds,
				request_id: requestId,
			},
		};

		// Set rate limit headers per OpenAPI spec (components/headers)
		c.header('X-RateLimit-Limit', '1000');
		c.header('X-RateLimit-Remaining', '999');
		c.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600));

		// Set cache header per OpenAPI spec description
		// "Cached for 60 seconds"
		c.header('Cache-Control', 'private, max-age=60');

		return c.json(response, 200);
	} catch (error) {
		// 500 Internal Server Error
		console.error('Metrics computation error:', error);

		const response: ErrorResponse = {
			error: {
				code: 'SRV_INTERNAL_ERROR',
				message: 'An unexpected error occurred. Please try again.',
			},
			request_id: requestId,
		};

		return c.json(response, 500);
	}
});

export default metrics;
