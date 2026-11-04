import { responseCache } from '../utils/memoryCache.js'

export const cacheResponse = (ttlSeconds = 30, cache = responseCache) => (req, res, next) => {
  if (req.method !== 'GET') return next()

  const key = req.originalUrl
  const hit = cache.get(key)
  if (hit !== undefined) {
    res.set('X-Cache', 'HIT')
    return res.status(200).type('json').send(hit)
  }

  res.set('X-Cache', 'MISS')
  const versionAtStart = cache.version()
  const sendJson = res.json.bind(res)
  res.json = (body) => {
    if (res.statusCode === 200 && cache.version() === versionAtStart) {
      cache.set(key, JSON.stringify(body), ttlSeconds * 1000)
    }
    return sendJson(body)
  }
  next()
}
