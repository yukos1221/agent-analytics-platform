/**
 * Test Helpers: HTTP Client
 *
 * Provides utilities for making HTTP requests to the API during tests.
 * Supports both unit tests (using Hono's built-in test interface)
 * and integration tests (using real HTTP against a running server).
 *
 * @see docs/06-testing-specification.md Section 3.3 - Integration Tests
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';

/**
 * Response wrapper with typed JSON parsing
 */
export interface TestResponse<T = unknown> {
	status: number;
	headers: Headers;
	body: T;
	raw: Response;
}

/**
 * HTTP client for integration testing against a real server
 */
export class TestHttpClient {
	constructor(private baseUrl: string) {}

	async post<T = unknown>(
		path: string,
		body: unknown,
		headers: Record<string, string> = {}
	): Promise<TestResponse<T>> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
			body: JSON.stringify(body),
		});

		const json = await response.json();
		return {
			status: response.status,
			headers: response.headers,
			body: json as T,
			raw: response,
		};
	}

	async get<T = unknown>(
		path: string,
		headers: Record<string, string> = {}
	): Promise<TestResponse<T>> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: 'GET',
			headers,
		});

		const json = await response.json();
		return {
			status: response.status,
			headers: response.headers,
			body: json as T,
			raw: response,
		};
	}
}

/**
 * Test server wrapper for integration tests.
 * Starts a real HTTP server on a random available port.
 */
export class TestServer {
	private server: Server | null = null;
	private _port: number = 0;
	private _url: string = '';

	constructor(private app: Hono) {}

	get port(): number {
		return this._port;
	}

	get url(): string {
		return this._url;
	}

	/**
	 * Start the test server on a random available port
	 */
	async start(): Promise<void> {
		return new Promise((resolve) => {
			this.server = serve(
				{
					fetch: this.app.fetch,
					port: 0, // Let OS assign random available port
				},
				(info) => {
					this._port = info.port;
					this._url = `http://localhost:${info.port}`;
					resolve();
				}
			);
		});
	}

	/**
	 * Stop the test server
	 */
	async stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.server) {
				this.server.close((err) => {
					if (err) reject(err);
					else resolve();
				});
			} else {
				resolve();
			}
		});
	}

	/**
	 * Get an HTTP client configured for this server
	 */
	client(): TestHttpClient {
		return new TestHttpClient(this._url);
	}
}

/**
 * Create a test server from a Hono app
 */
export function createTestServer(app: Hono): TestServer {
	return new TestServer(app);
}
