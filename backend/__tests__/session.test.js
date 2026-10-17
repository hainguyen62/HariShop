import jwt from 'jsonwebtoken'
import { parseCookies } from '../utils/cookies.js'

process.env.JWT_SECRET = 'test-secret'

describe('parseCookies', () => {
  it('đọc nhiều cookie và giải mã giá trị', () => {
    expect(parseCookies('a=1; hs_rt=abc%20def; b=')).toEqual({ a: '1', hs_rt: 'abc def', b: '' })
    expect(parseCookies('')).toEqual({})
    expect(parseCookies(undefined)).toEqual({})
  })
})

describe('generateToken', () => {
  it('ký token ngắn hạn kèm tokenVersion', async () => {
    const { default: generateToken } = await import('../utils/generateToken.js')
    const t = generateToken({ _id: 'u1', tokenVersion: 2 })
    const d = jwt.verify(t, 'test-secret')
    expect(d.id).toBe('u1')
    expect(d.tv).toBe(2)
    expect(d.exp - d.iat).toBe(15 * 60)
  })
  it('nhận cả id trần', async () => {
    const { default: generateToken } = await import('../utils/generateToken.js')
    expect(jwt.verify(generateToken('u2'), 'test-secret').tv).toBe(0)
  })
})
