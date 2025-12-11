import { Hono } from 'hono';
import {
	PeriodQuerySchema,
	MetricsOverviewResponse,
	generateRequestId,
	ErrorResponse,
} from '../schemas';
import { computeMetricsOverview } from '../services';

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
		// For MVP, we use a default org_id since dashboard auth is not yet implemented
		// TODO: Phase 2 - Extract org_id from JWT token
		// Per OpenAPI spec: "JWT access token obtained via OAuth 2.0/OIDC flow"
		// Token payload includes: custom:org_id
		const orgId = 'org_default';

		// Compute metrics from event store
		const metricsData = await computeMetricsOverview(
			orgId,
			period,
			compareParam
		);

		// Build response matching OpenAPI MetricsOverviewResponse schema exactly
		const response: MetricsOverviewResponse = {
			period: metricsData.period,
			metrics: metricsData.metrics,
			meta: {
				cache_hit: false, // TODO: Implement caching in Phase 2
				cache_ttl: 60,
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
