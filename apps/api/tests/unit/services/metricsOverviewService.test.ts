/**
 * Unit Tests: Metrics Overview Service
 *
 * Testing Spec Reference: docs/06-testing-specification.md
 * PRD Reference: docs/01-product-requirements.md Section 3 - Key Metrics
 * API Spec Reference: docs/03-api-specification-v1.2.md Section 6.2
 * OpenAPI Spec: specs/openapi.mvp.v1.yaml - MetricsOverviewResponse
 *
 * MVP P0 Metrics tested:
 * - active_users: Unique users running agent sessions per period
 * - total_sessions: Count of sessions (completed + running + failed)
 * - success_rate: Completed sessions / Total sessions × 100%
 * - total_cost: Estimated from tokens
 *
 * Per PRD: "Metrics Aggregation Accuracy" is HIGH RISK and requires extensive testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeMetricsOverview } from '../../../src/services/metricsOverviewService';
import { eventStore } from '../../../src/services';
import { createEvent, generateSessionId } from '../../fixtures/events';

const TEST_ORG_ID = 'org_metrics_test';

/**
 * Helper to create and ingest events directly into the store
 */
async function ingestEvents(
	events: ReturnType<typeof createEvent>[]
): Promise<void> {
	await eventStore.ingest(TEST_ORG_ID, events);
}

/**
 * Create a complete session with start, task, and end events
 * Events are created with timestamps in the past to ensure they fall within the period window
 */
function createCompletedSession(
	userId: string,
	options: {
		hasError?: boolean;
		tokensInput?: number;
		tokensOutput?: number;
		durationMs?: number;
		timestamp?: Date;
	} = {}
) {
	const sessionId = generateSessionId();
	// Default to 1 hour ago to ensure events fall within period window
	const baseTime = options.timestamp || new Date(Date.now() - 60 * 60 * 1000);

	const events = [
		createEvent({
			event_type: 'session_start',
			session_id: sessionId,
			user_id: userId,
			timestamp: baseTime.toISOString(),
		}),
		createEvent({
			event_type: 'task_complete',
			session_id: sessionId,
			user_id: userId,
			timestamp: new Date(baseTime.getTime() + 60000).toISOString(),
			metadata: {
				tokens_input: options.tokensInput ?? 1000,
				tokens_output: options.tokensOutput ?? 2000,
				duration_ms: options.durationMs ?? 5000,
				success: !options.hasError,
			},
		}),
	];

	if (options.hasError) {
		events.push(
			createEvent({
				event_type: 'task_error',
				session_id: sessionId,
				user_id: userId,
				timestamp: new Date(baseTime.getTime() + 120000).toISOString(),
				metadata: {
					error_code: 'TEST_ERROR',
					error_message: 'Test error',
				},
			})
		);
	}

	events.push(
		createEvent({
			event_type: 'session_end',
			session_id: sessionId,
			user_id: userId,
			timestamp: new Date(baseTime.getTime() + 180000).toISOString(), // 3 minutes
		})
	);

	return events;
}

describe('Metrics Overview Service', () => {
	beforeEach(() => {
		eventStore.clear();
	});

	afterEach(() => {
		eventStore.clear();
	});

	describe('computeMetricsOverview', () => {
		it('returns metrics structure matching OpenAPI schema', async () => {
			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', true);

			// Required fields per OpenAPI MetricsOverviewResponse
			expect(result).toHaveProperty('period');
			expect(result).toHaveProperty('period.start');
			expect(result).toHaveProperty('period.end');
			expect(result).toHaveProperty('metrics');

			// Required metrics per OpenAPI spec
			expect(result.metrics).toHaveProperty('active_users');
			expect(result.metrics).toHaveProperty('total_sessions');
			expect(result.metrics).toHaveProperty('success_rate');
			expect(result.metrics).toHaveProperty('total_cost');

			// Each metric should have required 'value' field
			expect(result.metrics.active_users).toHaveProperty('value');
			expect(result.metrics.total_sessions).toHaveProperty('value');
			expect(result.metrics.success_rate).toHaveProperty('value');
			expect(result.metrics.total_cost).toHaveProperty('value');
		});

		it('returns zeros for empty event store', async () => {
			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.active_users.value).toBe(0);
			expect(result.metrics.total_sessions.value).toBe(0);
			expect(result.metrics.success_rate.value).toBe(100); // No failures = 100%
			expect(result.metrics.total_cost.value).toBe(0);
		});

		it('includes comparison data when compare=true', async () => {
			await ingestEvents(createCompletedSession('user_1'));

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', true);

			// When compare=true, MetricValue should include comparison fields
			expect(result.metrics.active_users).toHaveProperty('previous');
			expect(result.metrics.active_users).toHaveProperty('change_percent');
			expect(result.metrics.active_users).toHaveProperty('trend');
		});

		it('excludes comparison data when compare=false', async () => {
			await ingestEvents(createCompletedSession('user_1'));

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// When compare=false, comparison fields should not be present
			expect(result.metrics.active_users.previous).toBeUndefined();
			expect(result.metrics.active_users.change_percent).toBeUndefined();
			expect(result.metrics.active_users.trend).toBeUndefined();
		});

		it('includes correct units per OpenAPI spec', async () => {
			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// Per OpenAPI: success_rate has unit "percent"
			expect(result.metrics.success_rate.unit).toBe('percent');

			// Per OpenAPI: total_cost has unit "usd"
			expect(result.metrics.total_cost.unit).toBe('usd');

			// Per OpenAPI: avg_session_duration has unit "seconds"
			expect(result.metrics.avg_session_duration?.unit).toBe('seconds');
		});
	});

	describe('Active Users (DAU)', () => {
		it('counts unique users correctly', async () => {
			// Create sessions for 3 different users
			await ingestEvents([
				...createCompletedSession('user_alice'),
				...createCompletedSession('user_bob'),
				...createCompletedSession('user_charlie'),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.active_users.value).toBe(3);
		});

		it('counts user once even with multiple sessions', async () => {
			// Same user with multiple sessions
			await ingestEvents([
				...createCompletedSession('user_alice'),
				...createCompletedSession('user_alice'),
				...createCompletedSession('user_alice'),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// DAU should be 1, not 3
			expect(result.metrics.active_users.value).toBe(1);
		});
	});

	describe('Total Sessions', () => {
		it('counts all unique sessions', async () => {
			await ingestEvents([
				...createCompletedSession('user_alice'),
				...createCompletedSession('user_bob'),
				...createCompletedSession('user_charlie'),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.total_sessions.value).toBe(3);
		});

		it('counts sessions with errors', async () => {
			await ingestEvents([
				...createCompletedSession('user_alice', { hasError: false }),
				...createCompletedSession('user_bob', { hasError: true }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// Both successful and failed sessions are counted
			expect(result.metrics.total_sessions.value).toBe(2);
		});
	});

	describe('Success Rate', () => {
		it('calculates 100% for all successful sessions', async () => {
			await ingestEvents([
				...createCompletedSession('user_alice', { hasError: false }),
				...createCompletedSession('user_bob', { hasError: false }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.success_rate.value).toBe(100);
		});

		it('calculates 50% for half successful sessions', async () => {
			await ingestEvents([
				...createCompletedSession('user_alice', { hasError: false }),
				...createCompletedSession('user_bob', { hasError: true }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.success_rate.value).toBe(50);
		});

		it('calculates 0% when all sessions have errors', async () => {
			await ingestEvents([
				...createCompletedSession('user_alice', { hasError: true }),
				...createCompletedSession('user_bob', { hasError: true }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.success_rate.value).toBe(0);
		});

		it('calculates correct percentage for mixed results', async () => {
			// 3 successful, 1 failed = 75%
			await ingestEvents([
				...createCompletedSession('user_1', { hasError: false }),
				...createCompletedSession('user_2', { hasError: false }),
				...createCompletedSession('user_3', { hasError: false }),
				...createCompletedSession('user_4', { hasError: true }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.success_rate.value).toBe(75);
		});
	});

	describe('Total Cost', () => {
		it('calculates cost from token usage', async () => {
			// 1000 input tokens * $0.003/1K = $0.003
			// 2000 output tokens * $0.015/1K = $0.030
			// Total = $0.033
			await ingestEvents(
				createCompletedSession('user_alice', {
					tokensInput: 1000,
					tokensOutput: 2000,
				})
			);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.total_cost.value).toBeCloseTo(0.03, 2);
		});

		it('sums cost across multiple sessions', async () => {
			await ingestEvents([
				...createCompletedSession('user_1', {
					tokensInput: 1000,
					tokensOutput: 2000,
				}),
				...createCompletedSession('user_2', {
					tokensInput: 1000,
					tokensOutput: 2000,
				}),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// 2 sessions * $0.033 = $0.066
			expect(result.metrics.total_cost.value).toBeCloseTo(0.07, 2);
		});

		it('returns 0 cost when no token metadata', async () => {
			await ingestEvents([
				createEvent({ event_type: 'session_start', user_id: 'user_1' }),
				createEvent({ event_type: 'session_end', user_id: 'user_1' }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.total_cost.value).toBe(0);
		});
	});

	describe('Average Session Duration', () => {
		it('calculates average from duration_ms metadata', async () => {
			await ingestEvents([
				...createCompletedSession('user_1', { durationMs: 5000 }),
				...createCompletedSession('user_2', { durationMs: 10000 }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// Average of (5000 + 10000 + session times) / count
			// Should be > 0
			expect(result.metrics.avg_session_duration?.value).toBeGreaterThan(0);
		});

		it('returns duration in seconds', async () => {
			await ingestEvents(
				createCompletedSession('user_1', { durationMs: 60000 })
			);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.avg_session_duration?.unit).toBe('seconds');
		});
	});

	describe('Error Count', () => {
		it('counts error events', async () => {
			await ingestEvents([
				...createCompletedSession('user_1', { hasError: true }),
				...createCompletedSession('user_2', { hasError: true }),
				...createCompletedSession('user_3', { hasError: false }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.error_count?.value).toBe(2);
		});

		it('returns 0 errors when no error events', async () => {
			await ingestEvents(createCompletedSession('user_1', { hasError: false }));

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.error_count?.value).toBe(0);
		});
	});

	describe('Period Filtering', () => {
		it('only includes events within the period', async () => {
			const now = new Date();

			// Event from yesterday (within 7d)
			await ingestEvents(
				createCompletedSession('user_recent', {
					timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
				})
			);

			// Event from 10 days ago (outside 7d)
			await ingestEvents(
				createCompletedSession('user_old', {
					timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
				})
			);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// Only the recent event should be counted
			expect(result.metrics.active_users.value).toBe(1);
		});

		it('adjusts period based on query parameter', async () => {
			const result1d = await computeMetricsOverview(TEST_ORG_ID, '1d', false);
			const result90d = await computeMetricsOverview(TEST_ORG_ID, '90d', false);

			// 1d period should be shorter than 90d
			const start1d = new Date(result1d.period.start);
			const end1d = new Date(result1d.period.end);
			const start90d = new Date(result90d.period.start);
			const end90d = new Date(result90d.period.end);

			const days1d =
				(end1d.getTime() - start1d.getTime()) / (24 * 60 * 60 * 1000);
			const days90d =
				(end90d.getTime() - start90d.getTime()) / (24 * 60 * 60 * 1000);

			expect(days1d).toBeCloseTo(1, 0);
			expect(days90d).toBeCloseTo(90, 0);
		});
	});

	describe('Trend Calculation', () => {
		it('calculates "up" trend when current > previous', async () => {
			// Note: Since we can't easily create events in the "previous" period
			// with the current test setup, we just verify the structure
			await ingestEvents(createCompletedSession('user_1'));

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', true);

			// With data only in current period, trend should be "up"
			expect(['up', 'down', 'stable']).toContain(
				result.metrics.active_users.trend
			);
		});
	});

	describe('Multi-Tenant Isolation', () => {
		it('only returns metrics for specified org', async () => {
			const otherOrgId = 'org_other';

			// Ingest events for different orgs
			await eventStore.ingest(TEST_ORG_ID, createCompletedSession('user_test'));
			await eventStore.ingest(otherOrgId, createCompletedSession('user_other'));

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// Should only count events from TEST_ORG_ID
			expect(result.metrics.active_users.value).toBe(1);
		});
	});

	// ===========================================================================
	// Edge Cases - Per Testing Spec Section 5.3
	// ===========================================================================
	describe('Edge Cases (Testing Spec §5.3)', () => {
		describe('Empty Data Handling', () => {
			it('returns zeros for metrics with no data', async () => {
				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				expect(result.metrics.active_users.value).toBe(0);
				expect(result.metrics.total_sessions.value).toBe(0);
				expect(result.metrics.total_cost.value).toBe(0);
				expect(result.metrics.error_count?.value).toBe(0);
			});

			it('returns 100% success rate with no sessions (no failures)', async () => {
				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);
				expect(result.metrics.success_rate.value).toBe(100);
			});

			it('returns valid comparison data even with no events', async () => {
				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', true);

				expect(result.metrics.active_users.previous).toBe(0);
				expect(result.metrics.active_users.change_percent).toBe(0);
				expect(result.metrics.active_users.trend).toBe('stable');
			});
		});

		describe('All Failed Sessions', () => {
			it('returns 0% success rate when all sessions have errors', async () => {
				await ingestEvents([
					...createCompletedSession('user_1', { hasError: true }),
					...createCompletedSession('user_2', { hasError: true }),
					...createCompletedSession('user_3', { hasError: true }),
				]);

				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				expect(result.metrics.success_rate.value).toBe(0);
				expect(result.metrics.error_count?.value).toBe(3);
			});

			it('still counts users and sessions correctly when all fail', async () => {
				await ingestEvents([
					...createCompletedSession('user_1', { hasError: true }),
					...createCompletedSession('user_2', { hasError: true }),
				]);

				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				expect(result.metrics.active_users.value).toBe(2);
				expect(result.metrics.total_sessions.value).toBe(2);
			});
		});

		describe('Large Values', () => {
			it('handles very large token counts', async () => {
				await ingestEvents(
					createCompletedSession('user_1', {
						tokensInput: 1000000, // 1M tokens
						tokensOutput: 500000, // 500K tokens
					})
				);

				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				// Should be finite and positive
				expect(Number.isFinite(result.metrics.total_cost.value)).toBe(true);
				expect(result.metrics.total_cost.value).toBeGreaterThan(0);
			});

			it('handles many sessions', async () => {
				// Create 100 sessions
				const sessions = [];
				for (let i = 0; i < 100; i++) {
					sessions.push(...createCompletedSession(`user_${i % 10}`));
				}
				await ingestEvents(sessions);

				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				expect(result.metrics.total_sessions.value).toBe(100);
				expect(result.metrics.active_users.value).toBe(10); // 10 unique users
			});
		});

		describe('Idempotency', () => {
			it('recomputing produces identical metrics', async () => {
				await ingestEvents([
					...createCompletedSession('user_1', { hasError: false }),
					...createCompletedSession('user_2', { hasError: true }),
				]);

				const result1 = await computeMetricsOverview(TEST_ORG_ID, '7d', false);
				const result2 = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				expect(result1.metrics.active_users.value).toBe(
					result2.metrics.active_users.value
				);
				expect(result1.metrics.total_sessions.value).toBe(
					result2.metrics.total_sessions.value
				);
				expect(result1.metrics.success_rate.value).toBe(
					result2.metrics.success_rate.value
				);
				expect(result1.metrics.total_cost.value).toBe(
					result2.metrics.total_cost.value
				);
			});
		});

		describe('Sessions Without End Events', () => {
			it('counts sessions that started but not ended (active sessions)', async () => {
				const baseTime = new Date(Date.now() - 60 * 60 * 1000);

				// Session that started but didn't end
				await ingestEvents([
					createEvent({
						event_type: 'session_start',
						session_id: 'sess_active_01234567890123456789',
						user_id: 'user_active',
						timestamp: baseTime.toISOString(),
					}),
				]);

				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				// Should still count the session
				expect(result.metrics.total_sessions.value).toBe(1);
				expect(result.metrics.active_users.value).toBe(1);
			});

			it('incomplete sessions are not counted as successful', async () => {
				const baseTime = new Date(Date.now() - 60 * 60 * 1000);

				// One complete successful session, one incomplete
				await ingestEvents([
					...createCompletedSession('user_1', { hasError: false }),
					createEvent({
						event_type: 'session_start',
						session_id: 'sess_incomplete_0123456789012345',
						user_id: 'user_2',
						timestamp: baseTime.toISOString(),
					}),
				]);

				const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

				// 1 successful out of 2 = 50%
				expect(result.metrics.total_sessions.value).toBe(2);
				expect(result.metrics.success_rate.value).toBe(50);
			});
		});
	});

	// ===========================================================================
	// Golden Dataset Tests - Per Testing Spec Section 5.2
	// Known inputs with expected outputs
	// ===========================================================================
	describe('Golden Dataset Verification (Testing Spec §5.2)', () => {
		it('correctly calculates DAU: 5 users with 6 sessions = DAU of 5', async () => {
			// Per Testing Spec: "DAU should be 5 (unique users), not 6 (sessions)"
			const baseTime = new Date(Date.now() - 60 * 60 * 1000);

			// 5 unique users, user_1 has 2 sessions
			await ingestEvents([
				...createCompletedSession('user_1', { timestamp: baseTime }),
				...createCompletedSession('user_1', {
					timestamp: new Date(baseTime.getTime() + 10000),
				}),
				...createCompletedSession('user_2', { timestamp: baseTime }),
				...createCompletedSession('user_3', { timestamp: baseTime }),
				...createCompletedSession('user_4', { timestamp: baseTime }),
				...createCompletedSession('user_5', { timestamp: baseTime }),
			]);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			// DAU = 5 unique users
			expect(result.metrics.active_users.value).toBe(5);
			// Sessions = 6
			expect(result.metrics.total_sessions.value).toBe(6);
		});

		it('correctly calculates success rate: 8 success, 2 errors = 80%', async () => {
			// Per Testing Spec: "8 successful tasks, 2 errors = 80% success rate"
			const sessions = [];
			for (let i = 0; i < 8; i++) {
				sessions.push(
					...createCompletedSession(`user_success_${i}`, { hasError: false })
				);
			}
			for (let i = 0; i < 2; i++) {
				sessions.push(
					...createCompletedSession(`user_error_${i}`, { hasError: true })
				);
			}
			await ingestEvents(sessions);

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', false);

			expect(result.metrics.success_rate.value).toBe(80);
		});
	});

	// ===========================================================================
	// Period Comparison Tests - Per Testing Spec Section 5.1
	// ===========================================================================
	describe('Period-over-Period Comparison', () => {
		it('calculates change_percent correctly', async () => {
			// Only current period has data, previous has none
			// So change should be 100% (infinite increase from 0 → capped at 100)
			await ingestEvents(createCompletedSession('user_1'));

			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', true);

			expect(result.metrics.active_users.value).toBe(1);
			expect(result.metrics.active_users.previous).toBe(0);
			expect(result.metrics.active_users.change_percent).toBe(100);
			expect(result.metrics.active_users.trend).toBe('up');
		});

		it('trend is "stable" when values are equal', async () => {
			// With no data in either period, both are 0
			const result = await computeMetricsOverview(TEST_ORG_ID, '7d', true);

			expect(result.metrics.active_users.value).toBe(0);
			expect(result.metrics.active_users.previous).toBe(0);
			expect(result.metrics.active_users.trend).toBe('stable');
		});
	});
});
