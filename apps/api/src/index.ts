import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { events, metrics } from './routes';

// Types matching OpenAPI HealthResponse schema
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthResponse {
	status: HealthStatus;
	timestamp: string;
	version: string;
	services?: {
		database?: HealthStatus;
		cache?: HealthStatus;
		analytics?: HealthStatus;
	};
}

const app = new Hono();

// ====================
// Health Check (no /v1 prefix)
// ====================
app.get('/health', (c) => {
	const response: HealthResponse = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: '1.0.0',
		services: {
			database: 'healthy',
			cache: 'healthy',
			analytics: 'healthy',
		},
	};
	return c.json(response, 200);
});

// ====================
// API v1 Routes
// ====================
const v1 = new Hono();

// Mount route handlers
v1.route('/events', events);
v1.route('/metrics', metrics);

// Mount v1 under /v1 prefix
app.route('/v1', v1);

// ====================
// Root endpoint
// ====================
app.get('/', (c) => {
	return c.json({
		name: 'AI Agent Analytics API',
		version: '1.0.0',
		endpoints: {
			health: '/health',
			events: '/v1/events',
			metrics: '/v1/metrics/overview',
		},
	});
});

// ====================
// Start server (local development)
// ====================
const port = Number(process.env.PORT) || 3001;

serve(
	{
		fetch: app.fetch,
		port,
	},
	(info) => {
		console.log(`🚀 API server running at http://localhost:${info.port}`);
		console.log(`   Health: http://localhost:${info.port}/health`);
		console.log(`   Events: http://localhost:${info.port}/v1/events`);
		console.log(
			`   Metrics: http://localhost:${info.port}/v1/metrics/overview`
		);
	}
);

export default app;
