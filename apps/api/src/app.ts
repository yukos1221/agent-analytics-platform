/**
 * Hono Application
 *
 * This module exports the Hono app instance without starting the server.
 * Use this for testing and importing the app configuration.
 *
 * For running the server, use index.ts which imports this and calls serve().
 */

import { Hono } from 'hono';
import { events, metrics, sessions } from './routes';
import docs from './routes/docs';

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
v1.route('/sessions', sessions);

// Mount v1 under /v1 prefix
app.route('/v1', v1);

// ====================
// API Documentation
// ====================
app.route('/docs', docs);

// ====================
// Root endpoint
// ====================
app.get('/', (c) => {
	return c.json({
		name: 'AI Agent Analytics API',
		version: '1.0.0',
		endpoints: {
			health: '/health',
			docs: '/docs',
			events: '/v1/events',
			metrics: '/v1/metrics/overview',
			timeseries: '/v1/metrics/timeseries',
			sessions: '/v1/sessions',
		},
	});
});

export default app;
