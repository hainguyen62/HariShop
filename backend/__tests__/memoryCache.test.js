import { createMemoryCache } from '../utils/memoryCache.js'
import { cacheResponse } from '../middleware/cacheMiddleware.js'

describe('memoryCache', () => {
  it('trả lại giá trị đã lưu và xóa khi hết hạn', () => {
    const cache = createMemoryCache()
    cache.set('a', 1, 1000)
    expect(cache.get('a')).toBe(1)
    const realNow = Date.now
    Date.now = () => realNow() + 2000
    expect(cache.get('a')).toBeUndefined()
    Date.now = realNow
  })

  it('loại mục cũ nhất khi vượt số mục tối đa', () => {
    const cache = createMemoryCache({ maxEntries: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('clear xóa hết và tăng version', () => {
    const cache = createMemoryCache()
    cache.set('a', 1)
    const v = cache.version()
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.version()).toBe(v + 1)
  })
})

const fakeRes = () => {
  const res = { statusCode: 200, headers: {}, body: undefined }
  res.set = (k, v) => { res.headers[k] = v; return res }
  res.status = (c) => { res.statusCode = c; return res }
  res.type = () => res
  res.send = (b) => { res.body = b; return res }
  res.json = (b) => { res.body = JSON.stringify(b); return res }
  return res
}

describe('cacheResponse', () => {
  const run = (cache, req, payload, status = 200) => {
    const res = fakeRes()
    let handled = false
    cacheResponse(30, cache)(req, res, () => {
      handled = true
      res.statusCode = status
      res.json(payload)
    })
    return { res, handled }
  }

  it('lần đầu MISS, lần hai HIT và không chạy lại handler', () => {
    const cache = createMemoryCache()
    const req = { method: 'GET', originalUrl: '/api/products?page=1' }
    const first = run(cache, req, { n: 1 })
    expect(first.handled).toBe(true)
    expect(first.res.headers['X-Cache']).toBe('MISS')
    const second = run(cache, req, { n: 2 })
    expect(second.handled).toBe(false)
    expect(second.res.headers['X-Cache']).toBe('HIT')
    expect(second.res.body).toBe('{"n":1}')
  })

  it('mỗi URL có cache riêng', () => {
    const cache = createMemoryCache()
    run(cache, { method: 'GET', originalUrl: '/a' }, { n: 1 })
    expect(run(cache, { method: 'GET', originalUrl: '/b' }, { n: 2 }).handled).toBe(true)
  })

  it('không cache phản hồi lỗi và không cache phương thức khác GET', () => {
    const cache = createMemoryCache()
    run(cache, { method: 'GET', originalUrl: '/x' }, { message: 'lỗi' }, 404)
    expect(cache.size()).toBe(0)
    run(cache, { method: 'POST', originalUrl: '/x' }, { n: 1 })
    expect(cache.size()).toBe(0)
  })

  it('không lưu kết quả đọc trước khi cache bị xóa giữa chừng', () => {
    const cache = createMemoryCache()
    const res = fakeRes()
    cacheResponse(30, cache)({ method: 'GET', originalUrl: '/y' }, res, () => {
      cache.clear()
      res.json({ n: 1 })
    })
    expect(cache.size()).toBe(0)
  })
})
