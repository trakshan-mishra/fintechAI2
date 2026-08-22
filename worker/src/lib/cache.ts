const cache = new Map<string, { value: unknown; expires: number }>();

export function cacheSet(key: string, value: unknown, ttlSeconds = 60): void {
  cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.value as T;
  cache.delete(key);
  return null;
}
