export const createRateLimiter = ({
  windowMs,
  max,
  message = 'Bạn thao tác quá nhanh, vui lòng thử lại sau',
  methods,
  skip,
}) => {
  const hits = new Map()

  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of hits) {
      if (now > record.resetAt) hits.delete(key)
    }
  }, Math.max(windowMs, 60000))
  cleanup.unref?.()

  return (req, res, next) => {
    if (methods && !methods.includes(req.method)) return next()
    if (skip && skip(req)) return next()

    const now = Date.now()
    let record = hits.get(req.ip)
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs }
      hits.set(req.ip, record)
    }
    record.count += 1

    res.set('X-RateLimit-Limit', String(max))
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - record.count)))
    if (record.count > max) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)))
      return res.status(429).json({ message })
    }
    next()
  }
}
