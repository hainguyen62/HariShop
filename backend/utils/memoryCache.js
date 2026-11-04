export const createMemoryCache = ({ ttlMs = 30000, maxEntries = 500 } = {}) => {
  const store = new Map()
  let version = 0

  const get = (key) => {
    const hit = store.get(key)
    if (!hit) return undefined
    if (hit.expiresAt <= Date.now()) {
      store.delete(key)
      return undefined
    }
    return hit.value
  }

  const set = (key, value, ttl = ttlMs) => {
    store.delete(key)
    if (store.size >= maxEntries) store.delete(store.keys().next().value)
    store.set(key, { value, expiresAt: Date.now() + ttl })
  }

  const clear = () => {
    store.clear()
    version += 1
  }

  return { get, set, clear, size: () => store.size, version: () => version }
}

export const responseCache = createMemoryCache({ ttlMs: 30000, maxEntries: 500 })
