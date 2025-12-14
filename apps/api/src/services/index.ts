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
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
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

// Add some sample data for testing
// This will be removed when real data ingestion is implemented
async function seedSampleData() {
    const sampleEvents: Event[] = [
        // Session 1: Completed, agent_test, production (2 days ago)
        {
            event_id: 'evt_sample_001',
            event_type: 'session_start',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            session_id: 'sess_abcd1234abcd1234abcd',
            user_id: 'user_admin123',
            agent_id: 'agent_test',
            environment: 'production',
            metadata: {},
        },
        {
            event_id: 'evt_sample_002',
            event_type: 'task_complete',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
            session_id: 'sess_abcd1234abcd1234abcd',
            user_id: 'user_admin123',
            agent_id: 'agent_test',
            environment: 'production',
            metadata: {
                tokens_input: 1500,
                tokens_output: 3000,
                duration_ms: 45000,
                success: true,
            },
        },
        {
            event_id: 'evt_sample_003',
            event_type: 'session_end',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 120000).toISOString(),
            session_id: 'sess_abcd1234abcd1234abcd',
            user_id: 'user_admin123',
            agent_id: 'agent_test',
            environment: 'production',
            metadata: {},
        },
        // Session 2: Completed, agent_claude, staging (1 day ago)
        {
            event_id: 'evt_sample_004',
            event_type: 'session_start',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            session_id: 'sess_efgh5678efgh5678efgh',
            user_id: 'user_dev456',
            agent_id: 'agent_claude',
            environment: 'staging',
            metadata: {},
        },
        {
            event_id: 'evt_sample_005',
            event_type: 'task_complete',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30000).toISOString(),
            session_id: 'sess_efgh5678efgh5678efgh',
            user_id: 'user_dev456',
            agent_id: 'agent_claude',
            environment: 'staging',
            metadata: {
                tokens_input: 800,
                tokens_output: 1200,
                duration_ms: 25000,
                success: true,
            },
        },
        {
            event_id: 'evt_sample_006',
            event_type: 'session_end',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 90000).toISOString(),
            session_id: 'sess_efgh5678efgh5678efgh',
            user_id: 'user_dev456',
            agent_id: 'agent_claude',
            environment: 'staging',
            metadata: {},
        },
        // Session 3: Error, agent_gpt, development (6 hours ago)
        {
            event_id: 'evt_sample_007',
            event_type: 'session_start',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            session_id: 'sess_ijkl9012ijkl9012ijkl',
            user_id: 'user_test789',
            agent_id: 'agent_gpt',
            environment: 'development',
            metadata: {},
        },
        {
            event_id: 'evt_sample_008',
            event_type: 'task_error',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000 + 45000).toISOString(),
            session_id: 'sess_ijkl9012ijkl9012ijkl',
            user_id: 'user_test789',
            agent_id: 'agent_gpt',
            environment: 'development',
            metadata: {
                tokens_input: 500,
                tokens_output: 200,
                duration_ms: 30000,
                error_code: 'TIMEOUT',
                error_message: 'Request timeout',
            },
        },
        {
            event_id: 'evt_sample_009',
            event_type: 'session_end',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000 + 60000).toISOString(),
            session_id: 'sess_ijkl9012ijkl9012ijkl',
            user_id: 'user_test789',
            agent_id: 'agent_gpt',
            environment: 'development',
            metadata: {},
        },
        // Session 4: Active, agent_test, production (30 minutes ago)
        {
            event_id: 'evt_sample_010',
            event_type: 'session_start',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            session_id: 'sess_mnop3456mnop3456mnop',
            user_id: 'user_admin123',
            agent_id: 'agent_test',
            environment: 'production',
            metadata: {},
        },
        {
            event_id: 'evt_sample_011',
            event_type: 'task_complete',
            timestamp: new Date(Date.now() - 30 * 60 * 1000 + 30000).toISOString(),
            session_id: 'sess_mnop3456mnop3456mnop',
            user_id: 'user_admin123',
            agent_id: 'agent_test',
            environment: 'production',
            metadata: {
                tokens_input: 1200,
                tokens_output: 2800,
                duration_ms: 25000,
                success: true,
            },
        },
        // Session 5: Completed, agent_claude, production (3 hours ago)
        {
            event_id: 'evt_sample_012',
            event_type: 'session_start',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            session_id: 'sess_qrst7890qrst7890qrst',
            user_id: 'user_prod001',
            agent_id: 'agent_claude',
            environment: 'production',
            metadata: {},
        },
        {
            event_id: 'evt_sample_013',
            event_type: 'task_complete',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 + 45000).toISOString(),
            session_id: 'sess_qrst7890qrst7890qrst',
            user_id: 'user_prod001',
            agent_id: 'agent_claude',
            environment: 'production',
            metadata: {
                tokens_input: 2000,
                tokens_output: 4500,
                duration_ms: 40000,
                success: true,
            },
        },
        {
            event_id: 'evt_sample_014',
            event_type: 'session_end',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 + 60000).toISOString(),
            session_id: 'sess_qrst7890qrst7890qrst',
            user_id: 'user_prod001',
            agent_id: 'agent_claude',
            environment: 'production',
            metadata: {},
        },
    ];

    await eventStore.ingest('org_test123', sampleEvents);
}

// Seed sample data on startup
setTimeout(() => {
    seedSampleData().catch(console.error);
}, 1000);

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
