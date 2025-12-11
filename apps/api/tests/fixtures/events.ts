/**
 * Test Fixtures: Events
 *
 * Reusable test data and factory functions for event testing.
 * Per Testing Spec (docs/06-testing-specification.md) Section 7.1:
 * "Fixtures: Static JSON files for unit tests, contract tests"
 *
 * @see specs/openapi.mvp.v1.yaml - Event schema
 * @see docs/03-api-specification-v1.2.md Section 6.1 - Event examples
 */

import type { Event, EventBatchRequest } from '../../src/schemas';

// =============================================================================
// API Keys
// =============================================================================

/**
 * Valid API key format per docs/03-api-specification-v1.2.md Section 4.3:
 * ak_{env}_{org_id}_{random}
 */
export const API_KEYS = {
	ORG_A: 'ak_live_org_testorg123_abcdefghij1234567890',
	ORG_B: 'ak_live_org_otherorg456_zyxwvutsrq0987654321',
	STAGING: 'ak_test_org_stagingorg_qwertyuiop1234567890',
	DEV: 'ak_dev_org_devorg789_asdfghjkl01234567890',
	INVALID_FORMAT: 'invalid-api-key-format',
	INVALID_PREFIX: 'xx_live_org_test_abcdefghij1234567890',
	MISSING_ORG: 'ak_live__abcdefghij1234567890',
} as const;

// =============================================================================
// Event Factories
// =============================================================================

let eventCounter = 0;

/**
 * Generate a unique event ID matching OpenAPI pattern: ^evt_[a-zA-Z0-9]{20,30}$
 */
export function generateEventId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 10);
	const counter = (++eventCounter).toString(36).padStart(4, '0');
	return `evt_${timestamp}${random}${counter}`.substring(0, 30);
}

/**
 * Generate a session ID matching OpenAPI pattern: ^sess_[a-zA-Z0-9]{20,30}$
 */
export function generateSessionId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 15);
	const extra = Math.random().toString(36).substring(2, 10);
	// Ensure we have at least 20 chars after 'sess_'
	const id = `${timestamp}${random}${extra}`.substring(0, 25);
	return `sess_${id}`;
}

/**
 * Create a valid event with optional overrides.
 * All required fields are pre-populated with valid values.
 */
export function createEvent(overrides: Partial<Event> = {}): Event {
	return {
		event_id: generateEventId(),
		event_type: 'task_complete',
		timestamp: new Date().toISOString(),
		session_id: 'sess_01HGX5VBJX2Q8JYXMVQZRK1234',
		user_id: 'user_dev_alice',
		agent_id: 'agent_claude_code',
		environment: 'production',
		metadata: {},
		...overrides,
	};
}

/**
 * Create a valid event batch request
 */
export function createEventBatch(
	count: number = 1,
	overrides: Partial<Event> = {}
): EventBatchRequest {
	return {
		events: Array.from({ length: count }, () => createEvent(overrides)),
	};
}

/**
 * Create a session with start and end events
 */
export function createSessionEvents(sessionId?: string): Event[] {
	const sid = sessionId ?? generateSessionId();
	const startTime = new Date();
	const endTime = new Date(startTime.getTime() + 300000); // 5 minutes later

	return [
		createEvent({
			event_type: 'session_start',
			session_id: sid,
			timestamp: startTime.toISOString(),
		}),
		createEvent({
			event_type: 'task_complete',
			session_id: sid,
			timestamp: new Date(startTime.getTime() + 60000).toISOString(),
			metadata: {
				task_type: 'code_generation',
				tokens_input: 1500,
				tokens_output: 3200,
				duration_ms: 4500,
				success: true,
			},
		}),
		createEvent({
			event_type: 'session_end',
			session_id: sid,
			timestamp: endTime.toISOString(),
		}),
	];
}

// =============================================================================
// Invalid Event Fixtures
// =============================================================================

/**
 * Events with various validation errors for testing error handling
 */
export const INVALID_EVENTS = {
	/** Missing all required fields */
	EMPTY: {},

	/** Invalid event_id pattern */
	BAD_EVENT_ID: createEvent({ event_id: 'bad-id' }),

	/** Invalid session_id pattern */
	BAD_SESSION_ID: createEvent({ session_id: 'bad-session' }),

	/** Invalid event_type */
	BAD_EVENT_TYPE: { ...createEvent(), event_type: 'not_a_valid_type' },

	/** Invalid timestamp format */
	BAD_TIMESTAMP: createEvent({ timestamp: '2025-13-45T99:99:99Z' }),

	/** Invalid environment */
	BAD_ENVIRONMENT: { ...createEvent(), environment: 'invalid_env' },

	/** user_id exceeds maxLength (128) */
	USER_ID_TOO_LONG: createEvent({ user_id: 'x'.repeat(129) }),

	/** agent_id exceeds maxLength (64) */
	AGENT_ID_TOO_LONG: createEvent({ agent_id: 'x'.repeat(65) }),

	/** Missing required event_type */
	MISSING_EVENT_TYPE: (() => {
		const e = createEvent();
		delete (e as Record<string, unknown>).event_type;
		return e;
	})(),

	/** Missing required timestamp */
	MISSING_TIMESTAMP: (() => {
		const e = createEvent();
		delete (e as Record<string, unknown>).timestamp;
		return e;
	})(),

	/** Missing required session_id */
	MISSING_SESSION_ID: (() => {
		const e = createEvent();
		delete (e as Record<string, unknown>).session_id;
		return e;
	})(),

	/** Missing required user_id */
	MISSING_USER_ID: (() => {
		const e = createEvent();
		delete (e as Record<string, unknown>).user_id;
		return e;
	})(),

	/** Missing required agent_id */
	MISSING_AGENT_ID: (() => {
		const e = createEvent();
		delete (e as Record<string, unknown>).agent_id;
		return e;
	})(),
} as const;

// =============================================================================
// Valid Event Type Examples (from OpenAPI spec)
// =============================================================================

export const EVENT_TYPES = [
	'session_start',
	'session_end',
	'session_pause',
	'session_resume',
	'task_start',
	'task_complete',
	'task_error',
	'task_cancel',
	'tool_call',
	'tool_response',
	'error',
	'warning',
	'feedback_positive',
	'feedback_negative',
] as const;

export const ENVIRONMENTS = ['production', 'staging', 'development'] as const;

// =============================================================================
// OpenAPI Spec Examples
// =============================================================================

/**
 * Example events from OpenAPI spec (specs/openapi.mvp.v1.yaml lines 121-148)
 */
export const OPENAPI_EXAMPLES = {
	sessionStart: {
		event_id: 'evt_01HGX5VBJX2Q8JYXMVQZRK3456',
		event_type: 'session_start',
		timestamp: '2025-12-09T10:30:00.000Z',
		session_id: 'sess_01HGX5VBJX2Q8JYXMVQZRK1234',
		user_id: 'user_dev_alice',
		agent_id: 'agent_claude_code',
		environment: 'production',
		metadata: {
			agent_version: '1.2.3',
			ide: 'vscode',
			os: 'macos',
		},
	},
	taskComplete: {
		event_id: 'evt_01HGX5VBJX2Q8JYXMVQZRK3457',
		event_type: 'task_complete',
		timestamp: '2025-12-09T10:35:00.000Z',
		session_id: 'sess_01HGX5VBJX2Q8JYXMVQZRK1234',
		user_id: 'user_dev_alice',
		agent_id: 'agent_claude_code',
		environment: 'production',
		metadata: {
			task_type: 'code_generation',
			tokens_input: 1500,
			tokens_output: 3200,
			duration_ms: 4500,
			success: true,
		},
	},
} as const;
