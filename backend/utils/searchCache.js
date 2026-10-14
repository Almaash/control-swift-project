
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;

const cache = new Map();
const inFlight = new Map();

function get(key) {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  // Move the accessed entry to the end (LRU behavior).
  cache.delete(key);
  cache.set(key, entry);

  return entry.data;
}

function set(key, data) {
  cache.delete(key);

  cache.set(key, {
    data,
    expiresAt: Date.now() + TTL_MS,
  });

  // Evict expired entries first.
  const now = Date.now();

  for (const [cacheKey, entry] of cache) {
    if (now >= entry.expiresAt) {
      cache.delete(cacheKey);
    }
  }

  // Keep memory usage bounded.
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

function getInFlight(key) {
  return inFlight.get(key);
}

function setInFlight(key, promise) {
  inFlight.set(key, promise);
}

function clearInFlight(key) {
  inFlight.delete(key);
}

module.exports = {
  get,
  set,
  getInFlight,
  setInFlight,
  clearInFlight,
};
