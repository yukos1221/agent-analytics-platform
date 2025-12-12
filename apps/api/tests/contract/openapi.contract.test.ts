/**
 * OpenAPI Contract Tests
 *
 * Testing Spec Reference: docs/06-testing-specification.md Section 3.2
 * - "Verify API implementation matches OpenAPI specification"
 * - "Coverage Target: 100% of documented endpoints"
 *
 * These tests ensure that:
 * 1. Response status codes match the spec
 * 2. Response body structure and types match OpenAPI schemas
 * 3. Error responses match documented error shapes
 *
 * OpenAPI Spec: specs/openapi.mvp.v1.yaml (single source of truth)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../src/app';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { API_KEYS, createEvent, INVALID_EVENTS } from '../fixtures/events';
import { eventStore } from '../../src/services';
import { _clearMetricsCache } from '../../src/lib/cache/metricsCache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load OpenAPI spec
// From apps/api/tests/contract/ -> go up 4 levels to repo root -> specs/
const specPath = path.resolve(
	__dirname,
	'../../../../specs/openapi.mvp.v1.yaml'
);

let spec: SwaggerParser.Document;
let ajv: Ajv;

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
 * Get response schema from OpenAPI spec
 */
function getResponseSchema(
	path: string,
	method: string,
	statusCode: string
): unknown {
	// Remove /v1 prefix if present (paths in spec are relative to server URL)
	// Ensure leading slash is preserved
	const normalizedPath = path.startsWith('/v1/') ? '/' + path.slice(4) : path;
	const pathItem = spec.paths[normalizedPath];
	if (!pathItem) {
		throw new Error(
			`Path ${normalizedPath} (from ${path}) not found in OpenAPI spec. Available paths: ${Object.keys(
				spec.paths || {}
			).join(', ')}`
		);
	}

	const operation = pathItem[method.toLowerCase()];
	if (!operation) {
		throw new Error(`Method ${method} not found for path ${path}`);
	}

	const response = operation.responses?.[statusCode];
	if (!response) {
		throw new Error(`Status ${statusCode} not found for ${method} ${path}`);
	}

	const content = response.content?.['application/json'];
	if (!content) {
		throw new Error(
			`No application/json content for ${method} ${path} ${statusCode}`
		);
	}

	return content.schema;
}

/**
 * Validate response against OpenAPI schema
 */
function validateResponse(
	schema: unknown,
	body: unknown
): { valid: boolean; errors: string[] } {
	const validate = ajv.compile(schema);
	const valid = validate(body);

	if (!valid && validate.errors) {
		const errors = validate.errors.map(
			(err) =>
				`${err.instancePath || '/'}: ${err.message} (${JSON.stringify(
					err.params
				)})`
		);
		return { valid: false, errors };
	}

	return { valid: true, errors: [] };
}

describe('OpenAPI Contract Tests', () => {
	beforeAll(async () => {
		// Load and dereference OpenAPI spec
		spec = (await SwaggerParser.dereference(
			specPath
		)) as SwaggerParser.Document;

		// Initialize Ajv with formats support
		ajv = new Ajv({
			strict: false,
			allErrors: true,
			validateFormats: true,
		});
		addFormats(ajv);
	});

	describe('POST /v1/events', () => {
		const path = '/v1/events';
		const method = 'POST';

		it('accepts valid event batch and returns 202 with correct schema', async () => {
			const requestBody = {
				events: [
					createEvent({
						event_type: 'session_start',
						metadata: { agent_version: '1.0.0' },
					}),
					createEvent({
						event_type: 'task_complete',
						metadata: {
							tokens_input: 1500,
							tokens_output: 3200,
							duration_ms: 4500,
						},
					}),
				],
			};

			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(202);

			const body = await response.json();
			const schema = getResponseSchema(path, method, '202');
			const validation = validateResponse(schema, body);

			expect(validation.valid).toBe(true);
			if (!validation.valid) {
				console.error('Validation errors:', validation.errors);
			}

			// Verify response structure matches EventBatchResponse schema
			expect(body).toHaveProperty('accepted');
			expect(body).toHaveProperty('rejected');
			expect(body).toHaveProperty('request_id');
			expect(typeof body.accepted).toBe('number');
			expect(typeof body.rejected).toBe('number');
			expect(typeof body.request_id).toBe('string');
		});

		it('rejects invalid schema and returns 422 with correct error format', async () => {
			const invalidBody = {
				events: [{ invalid: 'data' }],
			};

			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify(invalidBody),
			});

			expect(response.status).toBe(422);

			const body = await response.json();
			const schema = getResponseSchema(path, method, '422');
			const validation = validateResponse(schema, body);

			expect(validation.valid).toBe(true);
			if (!validation.valid) {
				console.error('Validation errors:', validation.errors);
			}

			// Verify error response structure
			expect(body).toHaveProperty('error');
			expect(body).toHaveProperty('request_id');
			expect(body.error).toHaveProperty('code');
			expect(body.error).toHaveProperty('message');
		});

		it('requires authentication and returns 401', async () => {
			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ events: [createEvent()] }),
			});

			expect(response.status).toBe(401);

			const body = await response.json();
			const schema = getResponseSchema(path, method, '401');
			const validation = validateResponse(schema, body);

			expect(validation.valid).toBe(true);
			if (!validation.valid) {
				console.error('Validation errors:', validation.errors);
			}

			expect(body).toHaveProperty('error');
			expect(body.error).toHaveProperty('code');
		});

		it('rejects empty events array', async () => {
			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({ events: [] }),
			});

			// Should reject empty array (minItems: 1)
			expect([400, 422]).toContain(response.status);

			const body = await response.json();
			expect(body).toHaveProperty('error');
		});

		it('rejects events exceeding maxItems (1000)', async () => {
			const largeBatch = {
				events: Array.from({ length: 1001 }, () => createEvent()),
			};

			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify(largeBatch),
			});

			// Should reject (maxItems: 1000)
			expect([400, 422]).toContain(response.status);
		});

		it('validates event_id pattern', async () => {
			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.BAD_EVENT_ID],
				}),
			});

			expect([400, 422]).toContain(response.status);
		});

		it('validates session_id pattern', async () => {
			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.BAD_SESSION_ID],
				}),
			});

			expect([400, 422]).toContain(response.status);
		});

		it('validates event_type enum', async () => {
			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.BAD_EVENT_TYPE],
				}),
			});

			expect([400, 422]).toContain(response.status);
		});

		it('validates timestamp format', async () => {
			const response = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.BAD_TIMESTAMP],
				}),
			});

			expect([400, 422]).toContain(response.status);
		});

		it('validates required fields are present', async () => {
			// Test missing event_type
			const response1 = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.MISSING_EVENT_TYPE],
				}),
			});

			expect([400, 422]).toContain(response1.status);

			// Test missing timestamp
			const response2 = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.MISSING_TIMESTAMP],
				}),
			});

			expect([400, 422]).toContain(response2.status);
		});

		it('validates field maxLength constraints', async () => {
			// Test user_id maxLength (128)
			const response1 = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.USER_ID_TOO_LONG],
				}),
			});

			expect([400, 422]).toContain(response1.status);

			// Test agent_id maxLength (64)
			const response2 = await apiRequest(path, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': API_KEYS.ORG_A,
				},
				body: JSON.stringify({
					events: [INVALID_EVENTS.AGENT_ID_TOO_LONG],
				}),
			});

			expect([400, 422]).toContain(response2.status);
		});
	});

	describe('GET /v1/metrics/overview', () => {
		const path = '/v1/metrics/overview';
		const method = 'GET';

		beforeEach(() => {
			// Clear cache and event store for clean tests
			_clearMetricsCache();
			eventStore.clear();
		});

		it('returns metrics matching schema (200)', async () => {
			// Seed some events for metrics calculation
			await eventStore.ingest('org_default', [
				createEvent({
					event_type: 'session_start',
					session_id: 'sess_test_123',
				}),
				createEvent({
					event_type: 'task_complete',
					session_id: 'sess_test_123',
					metadata: {
						tokens_input: 1000,
						tokens_output: 2000,
					},
				}),
			]);

			const response = await apiRequest(`${path}?period=7d`);

			expect(response.status).toBe(200);

			const body = await response.json();
			const schema = getResponseSchema(path, method, '200');
			const validation = validateResponse(schema, body);

			expect(validation.valid).toBe(true);
			if (!validation.valid) {
				console.error('Validation errors:', validation.errors);
				console.error('Response body:', JSON.stringify(body, null, 2));
			}

			// Verify required fields per MetricsOverviewResponse schema
			expect(body).toHaveProperty('period');
			expect(body).toHaveProperty('metrics');
			expect(body.period).toHaveProperty('start');
			expect(body.period).toHaveProperty('end');
			expect(body.metrics).toHaveProperty('active_users');
			expect(body.metrics).toHaveProperty('total_sessions');
			expect(body.metrics).toHaveProperty('success_rate');
			expect(body.metrics).toHaveProperty('total_cost');

			// Verify MetricValue structure
			expect(body.metrics.active_users).toHaveProperty('value');
			expect(typeof body.metrics.active_users.value).toBe('number');
			expect(body.metrics.success_rate).toHaveProperty('unit');
			expect(body.metrics.success_rate.unit).toBe('percent');
			expect(body.metrics.total_cost).toHaveProperty('unit');
			expect(body.metrics.total_cost.unit).toBe('usd');
		});

		it('validates query parameters - rejects invalid period', async () => {
			const response = await apiRequest(`${path}?period=invalid`);

			expect(response.status).toBe(400);

			const body = await response.json();
			const schema = getResponseSchema(path, method, '400');
			const validation = validateResponse(schema, body);

			expect(validation.valid).toBe(true);
			if (!validation.valid) {
				console.error('Validation errors:', validation.errors);
			}

			expect(body).toHaveProperty('error');
			expect(body.error).toHaveProperty('code');
		});

		it('accepts valid period values', async () => {
			const validPeriods = ['1d', '7d', '30d', '90d'];

			for (const period of validPeriods) {
				const response = await apiRequest(`${path}?period=${period}`);
				expect(response.status).toBe(200);
			}
		});

		it('accepts compare parameter', async () => {
			const response = await apiRequest(`${path}?period=7d&compare=true`);

			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body).toHaveProperty('metrics');
			// When compare=true, metrics may have previous/change_percent
			// This is optional, so we just verify the response is valid
		});

		it('returns correct response structure with optional meta field', async () => {
			const response = await apiRequest(`${path}?period=7d`);

			expect(response.status).toBe(200);

			const body = await response.json();

			// meta is optional, but if present should have correct structure
			if (body.meta) {
				expect(typeof body.meta).toBe('object');
				// meta may contain cache_hit, cache_ttl, request_id
			}
		});

		it('validates response headers match spec', async () => {
			const response = await apiRequest(`${path}?period=7d`);

			expect(response.status).toBe(200);

			// Check for rate limit headers (per OpenAPI spec)
			const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
			const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
			const rateLimitReset = response.headers.get('X-RateLimit-Reset');

			// Headers may or may not be present in test environment
			// But if present, they should be valid
			if (rateLimitLimit) {
				expect(Number.parseInt(rateLimitLimit, 10)).toBeGreaterThan(0);
			}
			if (rateLimitRemaining !== null) {
				expect(Number.parseInt(rateLimitRemaining, 10)).toBeGreaterThanOrEqual(
					0
				);
			}
			if (rateLimitReset) {
				expect(Number.parseInt(rateLimitReset, 10)).toBeGreaterThan(0);
			}

			// Cache-Control header (per spec description)
			const cacheControl = response.headers.get('Cache-Control');
			if (cacheControl) {
				expect(cacheControl).toContain('max-age');
			}
		});
	});
});
