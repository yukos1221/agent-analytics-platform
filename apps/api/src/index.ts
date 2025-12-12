/**
 * API Server Entry Point
 *
 * This module starts the HTTP server for local development.
 * For testing, import from './app' instead to avoid auto-starting the server.
 */

import { serve } from '@hono/node-server';
import app from './app';

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
		// eslint-disable-next-line no-console
		console.log(`🚀 API server running at http://localhost:${info.port}`);
		// eslint-disable-next-line no-console
		console.log(`   Health: http://localhost:${info.port}/health`);
		// eslint-disable-next-line no-console
		console.log(`   Events: http://localhost:${info.port}/v1/events`);
		// eslint-disable-next-line no-console
		console.log(
			`   Metrics: http://localhost:${info.port}/v1/metrics/overview`
		);
	}
);

export default app;
