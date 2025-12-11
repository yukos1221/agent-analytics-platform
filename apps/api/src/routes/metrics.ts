import { Hono } from 'hono';
import {
	PeriodQuerySchema,
	MetricsOverviewResponse,
	generateRequestId,
	ErrorResponse,
} from '../schemas';

const metrics = new Hono();

/**
 * GET /metrics/overview
 * Get dashboard overview metrics
 *
 * OpenAPI: operationId: getMetricsOverview
 * Auth: BearerAuth (JWT)
 * Query params: period (1d|7d|30d|90d, default: 7d), compare (boolean, default: true)
 * Status codes: 200, 400, 401, 429, 500
 */
metrics.get('/overview', async (c) => {
	const requestId = generateRequestId();

	// Parse and validate query parameters
	const periodParam = c.req.query('period') || '7d';
	const compareParam = c.req.query('compare') !== 'false'; // default true

	// Validate period parameter
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

	// Calculate period dates
	const now = new Date();
	const periodDays = {
		'1d': 1,
		'7d': 7,
		'30d': 30,
		'90d': 90,
	}[period];

	const end = now.toISOString();
	const start = new Date(
		now.getTime() - periodDays * 24 * 60 * 60 * 1000
	).toISOString();

	// TODO: Fetch actual metrics from database/cache
	// For now, return mock data matching the schema exactly
	const response: MetricsOverviewResponse = {
		period: {
			start,
			end,
		},
		metrics: {
			active_users: {
				value: 1247,
				...(compareParam && {
					previous: 1189,
					change_percent: 4.88,
					trend: 'up' as const,
				}),
			},
			total_sessions: {
				value: 8432,
				...(compareParam && {
					previous: 7891,
					change_percent: 6.86,
					trend: 'up' as const,
				}),
			},
			success_rate: {
				value: 94.2,
				unit: 'percent',
				...(compareParam && {
					previous: 92.8,
					change_percent: 1.51,
					trend: 'up' as const,
				}),
			},
			avg_session_duration: {
				value: 342,
				unit: 'seconds',
				...(compareParam && {
					previous: 328,
					change_percent: 4.27,
					trend: 'up' as const,
				}),
			},
			total_cost: {
				value: 2847.52,
				unit: 'usd',
				...(compareParam && {
					previous: 2654.31,
					change_percent: 7.28,
					trend: 'up' as const,
				}),
			},
			error_count: {
				value: 156,
				...(compareParam && {
					previous: 203,
					change_percent: -23.15,
					trend: 'down' as const,
				}),
			},
		},
		meta: {
			cache_hit: false,
			cache_ttl: 60,
			request_id: requestId,
		},
	};

	// Set rate limit headers per OpenAPI spec
	c.header('X-RateLimit-Limit', '1000');
	c.header('X-RateLimit-Remaining', '999');
	c.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600));

	// Set cache header per OpenAPI spec
	c.header('Cache-Control', 'private, max-age=60');

	return c.json(response, 200);
});

export default metrics;
