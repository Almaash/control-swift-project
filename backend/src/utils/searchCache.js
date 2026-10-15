const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;

const cache = new Map();
const inFlight = new Map();

export function get(key) {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  cache.delete(key);
  cache.set(key, entry);

  return entry.data;
}

export function set(key, data) {
  cache.delete(key);
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });

  const now = Date.now();

  for (const [cacheKey, entry] of cache) {
    if (now >= entry.expiresAt) cache.delete(cacheKey);
  }

  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export function getInFlight(key) {
  return inFlight.get(key);
}

export function setInFlight(key, promise) {
  inFlight.set(key, promise);
}

export function clearInFlight(key) {
  inFlight.delete(key);
}
