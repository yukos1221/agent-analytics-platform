import type { Event, EventBatchError } from '../schemas';

/**
 * Stored event with organization context
 */
export interface StoredEvent extends Event {
	org_id: string;
	ingested_at: string;
}

/**
 * Result of event ingestion
 */
export interface IngestResult {
	accepted: number;
	rejected: number;
	errors: EventBatchError[];
}

/**
 * In-Memory Event Store
 *
 * TODO: Replace with Postgres `events_raw` table per docs/05-development-deployment-v1.2.md
 * and docs/02-system-design.md. The events_raw table schema:
 *
 * CREATE TABLE events_raw (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   org_id VARCHAR(64) NOT NULL,
 *   event_id VARCHAR(64) NOT NULL UNIQUE,
 *   event_type VARCHAR(32) NOT NULL,
 *   timestamp TIMESTAMPTZ NOT NULL,
 *   session_id VARCHAR(64) NOT NULL,
 *   user_id VARCHAR(128) NOT NULL,
 *   agent_id VARCHAR(64) NOT NULL,
 *   environment VARCHAR(16) DEFAULT 'production',
 *   metadata JSONB,
 *   ingested_at TIMESTAMPTZ DEFAULT NOW(),
 *   CONSTRAINT unique_event_per_org UNIQUE (org_id, event_id)
 * );
 *
 * For MVP Phase 1, events are stored in-memory with the following limitations:
 * - Data is lost on server restart
 * - No persistence across instances
 * - Limited by available memory
 * - Duplicate detection is per-instance only
 */
class InMemoryEventStore {
	private events: Map<string, StoredEvent> = new Map();

	/**
	 * Ingest a batch of events for an organization
	 *
	 * @param orgId - Organization ID from auth context
	 * @param events - Array of events to ingest
	 * @returns Ingestion result with accepted/rejected counts and errors
	 */
	async ingest(orgId: string, events: Event[]): Promise<IngestResult> {
		const errors: EventBatchError[] = [];
		let accepted = 0;
		let rejected = 0;

		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			const key = `${orgId}:${event.event_id}`;

			// Check for duplicate event_id (per OpenAPI spec: "Duplicate event_ids are rejected")
			if (this.events.has(key)) {
				rejected++;
				errors.push({
					index: i,
					event_id: event.event_id,
					code: 'EVT_DUPLICATE',
					message: `Event with id ${event.event_id} already exists`,
				});
				continue;
			}

			// Store event with org context
			const storedEvent: StoredEvent = {
				...event,
				org_id: orgId,
				ingested_at: new Date().toISOString(),
			};

			this.events.set(key, storedEvent);
			accepted++;
		}

		return { accepted, rejected, errors };
	}

	/**
	 * Get all events for an organization (for testing/debugging)
	 */
	getByOrg(orgId: string): StoredEvent[] {
		const results: StoredEvent[] = [];
		for (const [key, event] of this.events) {
			if (key.startsWith(`${orgId}:`)) {
				results.push(event);
			}
		}
		return results.sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
		);
	}

	/**
	 * Get event count for an organization
	 */
	countByOrg(orgId: string): number {
		let count = 0;
		for (const key of this.events.keys()) {
			if (key.startsWith(`${orgId}:`)) {
				count++;
			}
		}
		return count;
	}

	/**
	 * Check if an event exists
	 */
	exists(orgId: string, eventId: string): boolean {
		return this.events.has(`${orgId}:${eventId}`);
	}

	/**
	 * Clear all events (for testing)
	 */
	clear(): void {
		this.events.clear();
	}

	/**
	 * Get total event count across all orgs
	 */
	get size(): number {
		return this.events.size;
	}
}

// Singleton instance for the application
// TODO: Replace with database repository when implementing Postgres storage
export const eventStore = new InMemoryEventStore();

// Expose the in-memory store on globalThis to allow packages outside the
// app (e.g., packages/database) to access the same singleton instance
// when running in test or local dev environments where modules may be
// loaded via different resolution strategies (CJS/ESM/Vite).
(
	globalThis as typeof globalThis & {
		__IN_MEMORY_EVENT_STORE?: typeof eventStore;
	}
).__IN_MEMORY_EVENT_STORE = eventStore;

// Re-export metrics service
export { computeMetricsOverview } from './metricsOverviewService';
export type { MetricsOverviewData } from './metricsOverviewService';
