import NodeCache from "node-cache";

// Cache configuration
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60 // Check for expired entries every minute
});

export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCached<T>(key: string, value: T): void {
  // Use the default TTL from the cache configuration
  cache.set(key, value);
}

export function setCachedWithTTL<T>(key: string, value: T, ttl: number): void {
  cache.set(key, value, ttl);
}

export function invalidateCache(key: string): void {
  cache.del(key);
}