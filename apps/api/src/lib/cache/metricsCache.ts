/**
 * Simple in-memory metrics cache for Phase 1.
 * - Uses a Map to store { value, expiresAt }
 * - TTL controlled per-entry (ms)
 * - Exposes getOrSetCachedMetrics(fetchFn) to centralize caching logic
 *
 * TODO: Replace with Redis (distributed) in Phase 2. Keep function signature
 * identical so swapping the implementation is straightforward.
 */

type CacheEntry = {
	value: any;
	expiresAt: number;
};

const store = new Map<string, CacheEntry>();

export async function getOrSetCachedMetrics<T>(
	key: string,
	ttlMs: number,
	fetchFn: () => Promise<T>
): Promise<{ value: T; cacheHit: boolean }> {
	const now = Date.now();
	const entry = store.get(key);
	if (entry && entry.expiresAt > now) {
		return { value: entry.value as T, cacheHit: true };
	}

	const value = await fetchFn();
	store.set(key, { value, expiresAt: now + ttlMs });
	return { value, cacheHit: false };
}

// Test helpers
export function _clearMetricsCache(): void {
	store.clear();
}

export function _setMetricsCache(key: string, value: any, ttlMs: number): void {
	store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Expose store for introspection in tests (avoid in prod)
export const _metricsCacheStore = store;

// NOTE: When moving to Redis, implement getOrSetCachedMetrics to use
// `GET` and `SETEX`/`SET` with PX expiry and maintain the same return shape.
