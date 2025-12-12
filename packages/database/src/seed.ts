/**
 * Database Seed Script
 *
 * Seeds the database with Phase 1 test data for local development.
 *
 * Data seeded:
 * - 1-2 organizations
 * - Sample users (via user_id references)
 * - API keys for testing
 * - Sessions with various statuses
 * - Events sufficient to generate non-trivial metrics for GET /v1/metrics/overview
 *
 * This script is idempotent - safe to run multiple times.
 * Uses ON CONFLICT DO NOTHING to prevent duplicates.
 *
 * Usage:
 *   pnpm db:seed
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

/**
 * Get database connection
 */
function getDb() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL environment variable is required');
	}
	const sql = postgres(connectionString, { max: 1 });
	return { db: drizzle(sql), sql };
}

/**
 * Seed organizations
 */
async function seedOrgs(db: ReturnType<typeof drizzle>): Promise<void> {
	await db.execute(sql`
		INSERT INTO orgs (id, name) VALUES 
			('acme123', 'Acme Corp'),
			('org_test', 'Test Organization')
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('✅ Seeded organizations');
}

/**
 * Seed API keys
 */
async function seedApiKeys(db: ReturnType<typeof drizzle>): Promise<void> {
	await db.execute(sql`
		INSERT INTO api_keys (id, api_key_prefix, org_id, agent_id, integration_id, status) VALUES
			('key_acme_1', 'ak_live_org_acme123_abcd1234', 'acme123', 'agent_claude_code', 'sdk-js-1', 'active'),
			('key_acme_2', 'ak_live_org_acme123_efgh5678', 'acme123', 'agent_gpt4', 'sdk-python-1', 'active'),
			('key_test_1', 'ak_live_org_test_xyz9876', 'org_test', 'agent_claude_code', 'sdk-js-1', 'active')
		ON CONFLICT (id) DO NOTHING;
	`);
	console.log('✅ Seeded API keys');
}

/**
 * Seed sessions with various statuses and time ranges
 *
 * Creates sessions across different time periods to test metrics:
 * - Last 24 hours
 * - Last 7 days
 * - Last 30 days
 *
 * Statuses: completed, running, failed
 */
async function seedSessions(db: ReturnType<typeof drizzle>): Promise<void> {
	// Sessions from last 24 hours
	await db.execute(sql`
		INSERT INTO sessions (id, org_id, user_id, agent_id, status, started_at, ended_at, duration_ms) VALUES
			('sess_recent_1', 'acme123', 'user_alice', 'agent_claude_code', 'completed', 
				now() - interval '2 hours', now() - interval '1 hour 50 minutes', 600000),
			('sess_recent_2', 'acme123', 'user_bob', 'agent_gpt4', 'completed', 
				now() - interval '5 hours', now() - interval '4 hours 45 minutes', 900000),
			('sess_recent_3', 'acme123', 'user_alice', 'agent_claude_code', 'running', 
				now() - interval '30 minutes', NULL, NULL),
			('sess_recent_4', 'org_test', 'user_charlie', 'agent_claude_code', 'failed', 
				now() - interval '1 hour', now() - interval '55 minutes', 300000)
		ON CONFLICT (id) DO NOTHING;
	`);

	// Sessions from last 7 days
	await db.execute(sql`
		INSERT INTO sessions (id, org_id, user_id, agent_id, status, started_at, ended_at, duration_ms) VALUES
			('sess_7d_1', 'acme123', 'user_alice', 'agent_claude_code', 'completed', 
				now() - interval '3 days', now() - interval '3 days' + interval '25 minutes', 1500000),
			('sess_7d_2', 'acme123', 'user_bob', 'agent_gpt4', 'completed', 
				now() - interval '5 days', now() - interval '5 days' + interval '40 minutes', 2400000),
			('sess_7d_3', 'acme123', 'user_dave', 'agent_claude_code', 'completed', 
				now() - interval '6 days', now() - interval '6 days' + interval '15 minutes', 900000),
			('sess_7d_4', 'org_test', 'user_charlie', 'agent_claude_code', 'completed', 
				now() - interval '2 days', now() - interval '2 days' + interval '20 minutes', 1200000)
		ON CONFLICT (id) DO NOTHING;
	`);

	// Sessions from last 30 days
	await db.execute(sql`
		INSERT INTO sessions (id, org_id, user_id, agent_id, status, started_at, ended_at, duration_ms) VALUES
			('sess_30d_1', 'acme123', 'user_alice', 'agent_claude_code', 'completed', 
				now() - interval '15 days', now() - interval '15 days' + interval '30 minutes', 1800000),
			('sess_30d_2', 'acme123', 'user_bob', 'agent_gpt4', 'completed', 
				now() - interval '20 days', now() - interval '20 days' + interval '45 minutes', 2700000),
			('sess_30d_3', 'acme123', 'user_eve', 'agent_claude_code', 'completed', 
				now() - interval '25 days', now() - interval '25 days' + interval '10 minutes', 600000)
		ON CONFLICT (id) DO NOTHING;
	`);

	console.log('✅ Seeded sessions');
}

/**
 * Seed events with metadata for metrics calculation
 *
 * Events include:
 * - session_start events
 * - task_complete events with token counts
 * - error events
 * - Various timestamps across different periods
 */
async function seedEvents(db: ReturnType<typeof drizzle>): Promise<void> {
	// Events for recent sessions (last 24 hours)
	await db.execute(sql`
		INSERT INTO events_raw (event_id, org_id, session_id, user_id, agent_id, event_type, timestamp, environment, metadata) VALUES
			('evt_recent_1', 'acme123', 'sess_recent_1', 'user_alice', 'agent_claude_code', 'session_start', 
				now() - interval '2 hours', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_recent_2', 'acme123', 'sess_recent_1', 'user_alice', 'agent_claude_code', 'task_complete', 
				now() - interval '1 hour 50 minutes', 'production', 
				'{"tokens_input":1500, "tokens_output":3200, "duration_ms":600000}'::jsonb),
			('evt_recent_3', 'acme123', 'sess_recent_2', 'user_bob', 'agent_gpt4', 'session_start', 
				now() - interval '5 hours', 'production', '{"agent_version":"2.1.0"}'::jsonb),
			('evt_recent_4', 'acme123', 'sess_recent_2', 'user_bob', 'agent_gpt4', 'task_complete', 
				now() - interval '4 hours 45 minutes', 'production', 
				'{"tokens_input":2500, "tokens_output":4800, "duration_ms":900000}'::jsonb),
			('evt_recent_5', 'acme123', 'sess_recent_3', 'user_alice', 'agent_claude_code', 'session_start', 
				now() - interval '30 minutes', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_recent_6', 'org_test', 'sess_recent_4', 'user_charlie', 'agent_claude_code', 'session_start', 
				now() - interval '1 hour', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_recent_7', 'org_test', 'sess_recent_4', 'user_charlie', 'agent_claude_code', 'error', 
				now() - interval '55 minutes', 'production', 
				'{"error_code":"TIMEOUT", "error_message":"Request timeout"}'::jsonb)
		ON CONFLICT (event_id) DO NOTHING;
	`);

	// Events for 7-day period sessions
	await db.execute(sql`
		INSERT INTO events_raw (event_id, org_id, session_id, user_id, agent_id, event_type, timestamp, environment, metadata) VALUES
			('evt_7d_1', 'acme123', 'sess_7d_1', 'user_alice', 'agent_claude_code', 'session_start', 
				now() - interval '3 days', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_7d_2', 'acme123', 'sess_7d_1', 'user_alice', 'agent_claude_code', 'task_complete', 
				now() - interval '3 days' + interval '25 minutes', 'production', 
				'{"tokens_input":3000, "tokens_output":6500, "duration_ms":1500000}'::jsonb),
			('evt_7d_3', 'acme123', 'sess_7d_2', 'user_bob', 'agent_gpt4', 'session_start', 
				now() - interval '5 days', 'production', '{"agent_version":"2.1.0"}'::jsonb),
			('evt_7d_4', 'acme123', 'sess_7d_2', 'user_bob', 'agent_gpt4', 'task_complete', 
				now() - interval '5 days' + interval '40 minutes', 'production', 
				'{"tokens_input":5000, "tokens_output":12000, "duration_ms":2400000}'::jsonb),
			('evt_7d_5', 'acme123', 'sess_7d_3', 'user_dave', 'agent_claude_code', 'session_start', 
				now() - interval '6 days', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_7d_6', 'acme123', 'sess_7d_3', 'user_dave', 'agent_claude_code', 'task_complete', 
				now() - interval '6 days' + interval '15 minutes', 'production', 
				'{"tokens_input":1200, "tokens_output":2800, "duration_ms":900000}'::jsonb),
			('evt_7d_7', 'org_test', 'sess_7d_4', 'user_charlie', 'agent_claude_code', 'session_start', 
				now() - interval '2 days', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_7d_8', 'org_test', 'sess_7d_4', 'user_charlie', 'agent_claude_code', 'task_complete', 
				now() - interval '2 days' + interval '20 minutes', 'production', 
				'{"tokens_input":2000, "tokens_output":4500, "duration_ms":1200000}'::jsonb)
		ON CONFLICT (event_id) DO NOTHING;
	`);

	// Events for 30-day period sessions
	await db.execute(sql`
		INSERT INTO events_raw (event_id, org_id, session_id, user_id, agent_id, event_type, timestamp, environment, metadata) VALUES
			('evt_30d_1', 'acme123', 'sess_30d_1', 'user_alice', 'agent_claude_code', 'session_start', 
				now() - interval '15 days', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_30d_2', 'acme123', 'sess_30d_1', 'user_alice', 'agent_claude_code', 'task_complete', 
				now() - interval '15 days' + interval '30 minutes', 'production', 
				'{"tokens_input":4000, "tokens_output":8500, "duration_ms":1800000}'::jsonb),
			('evt_30d_3', 'acme123', 'sess_30d_2', 'user_bob', 'agent_gpt4', 'session_start', 
				now() - interval '20 days', 'production', '{"agent_version":"2.1.0"}'::jsonb),
			('evt_30d_4', 'acme123', 'sess_30d_2', 'user_bob', 'agent_gpt4', 'task_complete', 
				now() - interval '20 days' + interval '45 minutes', 'production', 
				'{"tokens_input":6000, "tokens_output":15000, "duration_ms":2700000}'::jsonb),
			('evt_30d_5', 'acme123', 'sess_30d_3', 'user_eve', 'agent_claude_code', 'session_start', 
				now() - interval '25 days', 'production', '{"agent_version":"1.0.0"}'::jsonb),
			('evt_30d_6', 'acme123', 'sess_30d_3', 'user_eve', 'agent_claude_code', 'task_complete', 
				now() - interval '25 days' + interval '10 minutes', 'production', 
				'{"tokens_input":1000, "tokens_output":2200, "duration_ms":600000}'::jsonb)
		ON CONFLICT (event_id) DO NOTHING;
	`);

	console.log('✅ Seeded events');
}

/**
 * Main seed function
 */
export async function seed(): Promise<void> {
	console.log('🌱 Starting database seed...');
	const { db, sql } = getDb();

	try {
		await seedOrgs(db);
		await seedApiKeys(db);
		await seedSessions(db);
		await seedEvents(db);

		console.log('✅ Database seed completed successfully');
	} catch (error) {
		const err = error as Error;
		console.error('❌ Seed failed:', err.message);
		throw error;
	} finally {
		await sql.end();
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seed()
		.then(() => {
			process.exit(0);
		})
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}
