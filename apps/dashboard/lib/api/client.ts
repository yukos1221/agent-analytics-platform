/**
 * API Client for server and client-side data fetching
 * Based on Frontend Architecture Specification v1.1
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class APIError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'APIError';
	}
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
	params?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
}

/**
 * Generic API client for making typed requests
 */
export async function apiClient<T>(
	endpoint: string,
	options: FetchOptions = {}
): Promise<T> {
	const { params, body, ...fetchOptions } = options;

	// Build URL with query params
	const url = new URL(`${API_BASE_URL}${endpoint}`);
	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined) {
				url.searchParams.set(key, String(value));
			}
		});
	}

	// Setup headers
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(fetchOptions.headers as Record<string, string>),
	};

	// Add auth token if available (client-side)
	if (typeof window !== 'undefined') {
		const token = document.cookie
			.split('; ')
			.find((row) => row.startsWith('auth-token='))
			?.split('=')[1];

		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}
	}

	// Make request
	const response = await fetch(url.toString(), {
		...fetchOptions,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	// Handle errors
	if (!response.ok) {
		let errorData: {
			error?: { code?: string; message?: string; details?: unknown };
		} = {};
		try {
			errorData = await response.json();
		} catch {
			// Response wasn't JSON
		}

		throw new APIError(
			response.status,
			errorData.error?.code || 'UNKNOWN_ERROR',
			errorData.error?.message ||
				`Request failed with status ${response.status}`,
			errorData.error?.details as Record<string, unknown>
		);
	}

	return response.json();
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
	get: <T>(endpoint: string, params?: FetchOptions['params']) =>
		apiClient<T>(endpoint, { method: 'GET', params }),

	post: <T>(
		endpoint: string,
		body?: unknown,
		params?: FetchOptions['params']
	) => apiClient<T>(endpoint, { method: 'POST', body, params }),

	put: <T>(endpoint: string, body?: unknown, params?: FetchOptions['params']) =>
		apiClient<T>(endpoint, { method: 'PUT', body, params }),

	delete: <T>(endpoint: string, params?: FetchOptions['params']) =>
		apiClient<T>(endpoint, { method: 'DELETE', params }),
};
