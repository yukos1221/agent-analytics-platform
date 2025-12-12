/**
 * Generated API Client
 *
 * This file is auto-generated from specs/openapi.mvp.v1.yaml
 * DO NOT EDIT MANUALLY - regenerate with: pnpm generate:sdk
 *
 * Placeholder file for type-checking. Run `pnpm generate:sdk` to generate actual client.
 */

import type { paths } from './types';

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
 * Placeholder implementation. Run `pnpm generate:sdk` to generate full client.
 */
export class APIClient {
	constructor(config: ClientConfig = {}) {
		throw new Error(
			'SDK not generated. Run `pnpm generate:sdk` to generate the API client.'
		);
	}
}

// Export types for use in other packages
export type { paths, components } from './types';
