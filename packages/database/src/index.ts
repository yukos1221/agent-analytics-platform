// Database helper for runtime usage (simple, falls back to in-memory for local dev)
import postgres from 'postgres';
import type { Event } from '../../../apps/api/src/schemas/events';

export * from './schema';

let sql: ReturnType<typeof postgres> | null = null;

function getSql() {
	if (sql) return sql;
	const url = process.env.DATABASE_URL;
	if (!url) return null;
	sql = postgres(url, { max: 2 });
	return sql;
}

// Try to use apps/api in-memory event store as fallback when no DB configured
function getInMemoryEventStore() {
	try {
		// relative path from packages/database/src to apps/api/src/services
		// ../../../apps/api/src/services
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const svc =
			require('../../../apps/api/src/services') as typeof import('../../../apps/api/src/services');
		return svc.eventStore;
	} catch (e) {
		return null;
	}
}

export async function getApiKeyByPrefix(prefix: string) {
	const db = getSql();
	if (!db) return null;
	const rows =
		await db`SELECT id, api_key_prefix, org_id, agent_id, integration_id, status FROM api_keys WHERE api_key_prefix = ${prefix} LIMIT 1`;
	if (rows.length === 0) return null;
	return rows[0];
}

export async function queryEventsByOrgRange(
	orgId: string,
	start: Date,
	end: Date
) {
	const db = getSql();
	if (!db) return null;
	const rows = await db`
		SELECT event_id, org_id, session_id, user_id, agent_id, event_type, timestamp, environment, metadata
		FROM events_raw
		WHERE org_id = ${orgId} AND timestamp >= ${start} AND timestamp <= ${end}
		ORDER BY timestamp ASC
	`;
	return rows;
}

export async function querySessionsByOrgRange(
	orgId: string,
	start: Date,
	end: Date
) {
	const db = getSql();
	if (!db) return null;
	const rows = await db`
		SELECT id, org_id, user_id, agent_id, status, started_at, ended_at, duration_ms
		FROM sessions
		WHERE org_id = ${orgId} AND started_at >= ${start} AND started_at <= ${end}
	`;
	return rows;
}

export async function aggregateTokensByOrgRange(
	orgId: string,
	start: Date,
	end: Date
) {
	const db = getSql();
	if (!db) return { tokens_input: 0, tokens_output: 0 };

	const rows = await db`
		SELECT
			COALESCE(SUM((metadata->>'tokens_input')::bigint), 0) AS tokens_input,
			COALESCE(SUM((metadata->>'tokens_output')::bigint), 0) AS tokens_output
		FROM events_raw
		WHERE org_id = ${orgId} AND timestamp >= ${start} AND timestamp <= ${end}
	`;

	if (rows.length === 0) return { tokens_input: 0, tokens_output: 0 };
	return {
		tokens_input: Number(rows[0].tokens_input || 0),
		tokens_output: Number(rows[0].tokens_output || 0),
	};
}

export async function insertEvents(orgId: string, events: Event[]) {
	const db = getSql();
	if (!db) {
		// Fallback to in-memory event store used in apps/api
		const store = getInMemoryEventStore();
		if (!store) {
			throw new Error('No database configured and in-memory store unavailable');
		}
		return store.ingest(orgId, events);
	}

	let accepted: number = 0;
	let rejected: number = 0;
	const errors: Array<any> = [];

	// Insert events one by one to report duplicates per event
	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		try {
			await db`INSERT INTO events_raw (event_id, org_id, session_id, user_id, agent_id, event_type, timestamp, environment, metadata) VALUES (${
				ev.event_id
			}, ${orgId}, ${ev.session_id}, ${ev.user_id}, ${ev.agent_id}, ${
				ev.event_type
			}, ${new Date(ev.timestamp)}, ${ev.environment || 'production'}, ${
				ev.metadata || {}
			})`;
			accepted++;
		} catch (err: any) {
			// Postgres unique violation code 23505 -> duplicate
			if (err && err.code === '23505') {
				rejected++;
				errors.push({
					index: i,
					event_id: ev.event_id,
					code: 'EVT_DUPLICATE',
					message: 'Duplicate event',
				});
				continue;
			}
			// Other DB error
			rejected++;
			errors.push({
				index: i,
				event_id: ev.event_id,
				code: 'EVT_DB_ERROR',
				message: String(err),
			});
		}
	}

	// Note: For performance, Phase 2 will use Kinesis + bulk inserts
	// For now, return a simplified result
	return { accepted, rejected, errors };
}
