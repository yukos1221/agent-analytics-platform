#!/usr/bin/env tsx
/**
 * OpenAPI Code Generation Script
 *
 * Generates TypeScript types and API client from OpenAPI specification.
 *
 * Per API Spec §11.3: "OpenAPI 3.0 Specification (Single Source of Truth)"
 * Per Dev/Deploy Spec: SDK generation from OpenAPI spec
 *
 * Usage:
 *   pnpm generate
 *   pnpm generate:sdk
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../../');
const specPath = path.join(repoRoot, 'specs/openapi.mvp.v1.yaml');
const outputDir = path.join(__dirname, '../src/generated');

async function generate() {
	console.log('🔧 Generating TypeScript SDK from OpenAPI spec...');

	// Ensure output directory exists
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Check if spec file exists
	if (!fs.existsSync(specPath)) {
		throw new Error(`OpenAPI spec not found: ${specPath}`);
	}

	console.log(`📄 Reading spec from: ${specPath}`);

	try {
		// Generate TypeScript types using openapi-typescript
		console.log('📦 Generating TypeScript types...');
		execSync(
			`npx openapi-typescript "${specPath}" -o "${path.join(
				outputDir,
				'types.ts'
			)}"`,
			{
				cwd: repoRoot,
				stdio: 'inherit',
			}
		);

		console.log('✅ TypeScript types generated successfully');
		console.log(`   Output: ${path.join(outputDir, 'types.ts')}`);

		// Generate a simple API client
		console.log('📦 Generating API client...');
		await generateClient(specPath, outputDir);

		console.log('✅ SDK generation complete!');
		console.log(`   Types: ${path.join(outputDir, 'types.ts')}`);
		console.log(`   Client: ${path.join(outputDir, 'client.ts')}`);
	} catch (error) {
		console.error('❌ Generation failed:', error);
		process.exit(1);
	}
}

/**
 * Generate a simple typed API client
 */
async function generateClient(specPath: string, outputDir: string) {
	// Read and parse YAML spec
	const specContent = fs.readFileSync(specPath, 'utf-8');
	const specObj = yaml.load(specContent) as {
		paths: Record<string, Record<string, unknown>>;
		servers?: Array<{ url: string }>;
	};

	const clientCode = generateClientCode(specObj);
	fs.writeFileSync(path.join(outputDir, 'client.ts'), clientCode);
}

/**
 * Generate TypeScript client code from OpenAPI spec
 */
function generateClientCode(spec: {
	paths: Record<string, Record<string, unknown>>;
	servers?: Array<{ url: string }>;
}) {
	const baseUrl = spec.servers?.[0]?.url || 'http://localhost:3001';

	return `/**
 * Generated API Client
 * 
 * This file is auto-generated from specs/openapi.mvp.v1.yaml
 * DO NOT EDIT MANUALLY - regenerate with: pnpm generate:sdk
 * 
 * Per API Spec §11.3: OpenAPI as single source of truth
 */

import type { paths } from './types';

type Paths = paths;

// Extract request/response types from OpenAPI paths
type Endpoints = {
${Object.entries(spec.paths || {})
	.map(([path, methods]) => {
		const methodEntries = Object.entries(methods as Record<string, unknown>);
		return methodEntries
			.map(([method]) => {
				const operationId = (methods[method] as { operationId?: string })
					?.operationId;
				if (!operationId) return '';
				return `  '${operationId}': { path: '${path}'; method: '${method.toUpperCase()}' };`;
			})
			.filter(Boolean)
			.join('\n');
	})
	.filter(Boolean)
	.join('\n')}
};

/**
 * API Client Configuration
 */
export interface ClientConfig {
	baseUrl?: string;
	apiKey?: string;
	accessToken?: string;
	headers?: Record<string, string>;
}

/**
 * Typed API Client
 * 
 * Provides type-safe methods for API endpoints.
 * Types are generated from OpenAPI spec.
 */
export class APIClient {
	private baseUrl: string;
	private headers: Record<string, string>;

	constructor(config: ClientConfig = {}) {
		this.baseUrl = config.baseUrl || '${baseUrl}';
		this.headers = {
			'Content-Type': 'application/json',
			...(config.headers || {}),
		};

		if (config.apiKey) {
			this.headers['X-API-Key'] = config.apiKey;
		}

		if (config.accessToken) {
			this.headers['Authorization'] = \`Bearer \${config.accessToken}\`;
		}
	}

	/**
	 * POST /v1/events
	 * Ingest analytics events (batch)
	 */
	async ingestEvents(
		request: Paths['/v1/events']['post']['requestBody']['content']['application/json']
	): Promise<
		Paths['/v1/events']['post']['responses']['202']['content']['application/json']
	> {
		const response = await fetch(\`\${this.baseUrl}/v1/events\`, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(
				\`API Error: \${response.status} - \${error.error?.message || response.statusText}\`
			);
		}

		return response.json();
	}

	/**
	 * GET /v1/metrics/overview
	 * Get dashboard overview metrics
	 */
	async getMetricsOverview(params?: {
		period?: '1d' | '7d' | '30d' | '90d';
		compare?: boolean;
	}): Promise<
		Paths['/v1/metrics/overview']['get']['responses']['200']['content']['application/json']
	> {
		const query = new URLSearchParams();
		if (params?.period) query.set('period', params.period);
		if (params?.compare !== undefined) query.set('compare', String(params.compare));

		const url = \`\${this.baseUrl}/v1/metrics/overview\${query.toString() ? \`?\${query.toString()}\` : ''}\`;
		const response = await fetch(url, {
			method: 'GET',
			headers: this.headers,
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(
				\`API Error: \${response.status} - \${error.error?.message || response.statusText}\`
			);
		}

		return response.json();
	}

	/**
	 * Generic fetch method for other endpoints
	 */
	async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
			...options,
			headers: {
				...this.headers,
				...(options.headers || {}),
			},
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(
				\`API Error: \${response.status} - \${error.error?.message || response.statusText}\`
			);
		}

		return response.json();
	}
}

// Export types for use in other packages
export type { paths, components } from './types';
`;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	generate()
		.then(() => {
			process.exit(0);
		})
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}
