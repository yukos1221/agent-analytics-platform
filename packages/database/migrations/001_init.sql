-- Initial schema for Phase 1 (Postgres / Timescale ready)
-- Creates orgs, sessions, events_raw, and api_keys tables.
--
-- NOTE: This SQL migration has been superseded by TypeScript migrations
-- in packages/database/src/migrations/0001_init_schema.ts
-- The TypeScript migration provides reversible up/down functions.
-- This file is kept for reference but should not be used directly.

BEGIN;

-- Orgs
CREATE TABLE IF NOT EXISTS orgs (
  id varchar(64) PRIMARY KEY,
  name varchar(256) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions
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
CREATE INDEX IF NOT EXISTS idx_sessions_org_started ON sessions (org_id, started_at);

-- Events raw (ingestion)
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
CREATE INDEX IF NOT EXISTS idx_events_org_time ON events_raw (org_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session ON events_raw (session_id);

-- API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id varchar(64) PRIMARY KEY,
  api_key_prefix varchar(64) NOT NULL,
  org_id varchar(64) NOT NULL,
  agent_id varchar(64),
  integration_id varchar(128),
  status varchar(16) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (api_key_prefix);

-- Seed basic orgs and sample data for local testing
INSERT INTO orgs (id, name) VALUES ('acme123', 'Acme Corp') ON CONFLICT DO NOTHING;
INSERT INTO orgs (id, name) VALUES ('org_test', 'Test Org') ON CONFLICT DO NOTHING;

-- Seed sample API key for local development (do not use in production)
INSERT INTO api_keys (id, api_key_prefix, org_id, agent_id, integration_id, status)
VALUES ('key_acme_1', 'ak_live_org_acme123_abcd1234', 'acme123', 'agent_claude_code', 'sdk-js-1', 'active')
ON CONFLICT DO NOTHING;

-- Seed a small session and events for metrics smoke tests
INSERT INTO sessions (id, org_id, user_id, agent_id, status, started_at, ended_at, duration_ms)
VALUES ('sess_sample_1', 'acme123', 'user_alice', 'agent_claude_code', 'completed', now() - interval '1 hour', now() - interval '55 minutes', 300000)
ON CONFLICT DO NOTHING;

INSERT INTO events_raw (event_id, org_id, session_id, user_id, agent_id, event_type, timestamp, environment, metadata)
VALUES (
  'evt_sample_1', 'acme123', 'sess_sample_1', 'user_alice', 'agent_claude_code', 'session_start', now() - interval '1 hour', 'production', '{"agent_version":"1.0.0"}'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO events_raw (event_id, org_id, session_id, user_id, agent_id, event_type, timestamp, environment, metadata)
VALUES (
  'evt_sample_2', 'acme123', 'sess_sample_1', 'user_alice', 'agent_claude_code', 'task_complete', now() - interval '55 minutes', 'production', '{"tokens_input":1500, "tokens_output":3200, "duration_ms":4500}'::jsonb
)
ON CONFLICT DO NOTHING;

COMMIT;
