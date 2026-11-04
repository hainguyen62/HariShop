import { createRateLimiter } from '../middleware/rateLimitMiddleware.js'

const fakeRes = () => {
  const res = { statusCode: 200, headers: {}, body: undefined }
  res.set = (k, v) => { res.headers[k] = v; return res }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

const hit = (limiter, req) => {
  const res = fakeRes()
  let passed = false
  limiter(req, res, () => { passed = true })
  return { res, passed }
}

describe('createRateLimiter', () => {
  it('cho qua đến mức tối đa rồi trả 429 kèm Retry-After', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 2 })
    const req = { ip: '1.1.1.1', method: 'GET', path: '/x' }
    expect(hit(limiter, req).passed).toBe(true)
    expect(hit(limiter, req).passed).toBe(true)
    const blocked = hit(limiter, req)
    expect(blocked.passed).toBe(false)
    expect(blocked.res.statusCode).toBe(429)
    expect(Number(blocked.res.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('mỗi IP được đếm riêng', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 1 })
    expect(hit(limiter, { ip: 'a', method: 'GET', path: '/' }).passed).toBe(true)
    expect(hit(limiter, { ip: 'b', method: 'GET', path: '/' }).passed).toBe(true)
  })

  it('chỉ áp dụng cho các phương thức được chọn', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 1, methods: ['POST'] })
    for (let i = 0; i < 5; i += 1) expect(hit(limiter, { ip: 'a', method: 'GET', path: '/' }).passed).toBe(true)
    expect(hit(limiter, { ip: 'a', method: 'POST', path: '/' }).passed).toBe(true)
    expect(hit(limiter, { ip: 'a', method: 'POST', path: '/' }).passed).toBe(false)
  })

  it('bỏ qua đường dẫn webhook theo hàm skip', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 1, skip: (req) => req.path.includes('webhook') })
    for (let i = 0; i < 5; i += 1) expect(hit(limiter, { ip: 'a', method: 'POST', path: '/orders/sepay-webhook' }).passed).toBe(true)
  })

  it('đếm lại khi hết cửa sổ thời gian', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1 })
    const req = { ip: 'a', method: 'GET', path: '/' }
    hit(limiter, req)
    expect(hit(limiter, req).passed).toBe(false)
    const realNow = Date.now
    Date.now = () => realNow() + 2000
    expect(hit(limiter, req).passed).toBe(true)
    Date.now = realNow
  })
})
