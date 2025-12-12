import {
	pgTable,
	varchar,
	timestamp,
	integer,
	jsonb,
} from 'drizzle-orm/pg-core';

// Minimal orgs table (Phase 1)
export const orgs = pgTable('orgs', {
	id: varchar('id', { length: 64 }).primaryKey(),
	name: varchar('name', { length: 256 }).notNull(),
	created_at: timestamp('created_at').defaultNow().notNull(),
});

// Sessions table (MVP shape)
export const sessions = pgTable('sessions', {
	id: varchar('id', { length: 64 }).primaryKey(), // sess_...
	org_id: varchar('org_id', { length: 64 }).notNull(),
	user_id: varchar('user_id', { length: 128 }).notNull(),
	agent_id: varchar('agent_id', { length: 64 }).notNull(),
	status: varchar('status', { length: 32 }).notNull(),
	started_at: timestamp('started_at').notNull(),
	ended_at: timestamp('ended_at'),
	duration_ms: integer('duration_ms'),
	created_at: timestamp('created_at').defaultNow().notNull(),
});

// Raw events ingestion table
export const events_raw = pgTable('events_raw', {
	event_id: varchar('event_id', { length: 64 }).primaryKey(), // evt_...
	org_id: varchar('org_id', { length: 64 }).notNull(),
	session_id: varchar('session_id', { length: 64 }).notNull(),
	user_id: varchar('user_id', { length: 128 }).notNull(),
	agent_id: varchar('agent_id', { length: 64 }).notNull(),
	event_type: varchar('event_type', { length: 64 }).notNull(),
	timestamp: timestamp('timestamp').notNull(),
	environment: varchar('environment', { length: 32 })
		.notNull()
		.default('production'),
	metadata: jsonb('metadata').$type<Record<string, unknown>>(),
	ingested_at: timestamp('ingested_at').defaultNow().notNull(),
});

// API keys table (for Phase 1 lookup)
export const api_keys = pgTable('api_keys', {
	id: varchar('id', { length: 64 }).primaryKey(),
	api_key_prefix: varchar('api_key_prefix', { length: 64 }).notNull(),
	org_id: varchar('org_id', { length: 64 }).notNull(),
	agent_id: varchar('agent_id', { length: 64 }),
	integration_id: varchar('integration_id', { length: 128 }),
	status: varchar('status', { length: 16 }).notNull().default('active'),
	created_at: timestamp('created_at').defaultNow().notNull(),
});
