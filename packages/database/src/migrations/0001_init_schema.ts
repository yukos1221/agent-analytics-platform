import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export const id = '0001_init_schema';
export const description =
	'Create initial Phase 1 schema: orgs, sessions, events_raw, api_keys';

/**
 * Migration UP: Create all Phase 1 tables
 *
 * Tables created:
 * - orgs: Organizations (tenants)
 * - sessions: Agent sessions
 * - events_raw: Raw event ingestion table
 * - api_keys: API key lookup table
 *
 * All migrations must be reversible (see down() function).
 */
export async function up(db: PostgresJsDatabase): Promise<void> {
	await db.execute(sql`
		-- Orgs table
		CREATE TABLE IF NOT EXISTS orgs (
			id varchar(64) PRIMARY KEY,
			name varchar(256) NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now()
		);
	`);

	await db.execute(sql`
		-- Sessions table
		CREATE TABLE IF NOT EXISTS sessions (
			id varchar(64) PRIMARY KEY,
			org_id varchar(64) NOT NULL,
			user_id varchar(128) NOT NULL,
			agent_id varchar(64) NOT NULL,
			status varchar(32) NOT NULL,
			started_at timestamptz NOT NULL,
			ended_at timestamptz,
			duration_ms integer,
			created_at timestamptz NOT NULL DEFAULT now()
		);
	`);

	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS idx_sessions_org_started ON sessions (org_id, started_at);
	`);

	await db.execute(sql`
		-- Events raw (ingestion) table
		CREATE TABLE IF NOT EXISTS events_raw (
			event_id varchar(64) PRIMARY KEY,
			org_id varchar(64) NOT NULL,
			session_id varchar(64) NOT NULL,
			user_id varchar(128) NOT NULL,
			agent_id varchar(64) NOT NULL,
			event_type varchar(64) NOT NULL,
			timestamp timestamptz NOT NULL,
			environment varchar(32) NOT NULL DEFAULT 'production',
			metadata jsonb,
			ingested_at timestamptz NOT NULL DEFAULT now()
		);
	`);

	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS idx_events_org_time ON events_raw (org_id, timestamp);
	`);

	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS idx_events_session ON events_raw (session_id);
	`);

	await db.execute(sql`
		-- API keys table
		CREATE TABLE IF NOT EXISTS api_keys (
			id varchar(64) PRIMARY KEY,
			api_key_prefix varchar(64) NOT NULL,
			org_id varchar(64) NOT NULL,
			agent_id varchar(64),
			integration_id varchar(128),
			status varchar(16) NOT NULL DEFAULT 'active',
			created_at timestamptz NOT NULL DEFAULT now()
		);
	`);

	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (api_key_prefix);
	`);
}

/**
 * Migration DOWN: Rollback - drop all tables in reverse order
 *
 * This rollback removes all Phase 1 tables. Use with caution in production.
 * In production, consider creating a backup before rolling back.
 */
export async function down(db: PostgresJsDatabase): Promise<void> {
	// Drop tables in reverse order (respecting foreign key dependencies)
	// Note: We don't have explicit FKs yet, but drop in safe order anyway

	await db.execute(sql`DROP INDEX IF EXISTS idx_api_keys_prefix;`);
	await db.execute(sql`DROP TABLE IF EXISTS api_keys CASCADE;`);

	await db.execute(sql`DROP INDEX IF EXISTS idx_events_session;`);
	await db.execute(sql`DROP INDEX IF EXISTS idx_events_org_time;`);
	await db.execute(sql`DROP TABLE IF EXISTS events_raw CASCADE;`);

	await db.execute(sql`DROP INDEX IF EXISTS idx_sessions_org_started;`);
	await db.execute(sql`DROP TABLE IF EXISTS sessions CASCADE;`);

	await db.execute(sql`DROP TABLE IF EXISTS orgs CASCADE;`);
}
