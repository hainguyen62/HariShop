import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import RefreshToken from '../models/refreshTokenModel.js'
import { parseCookies } from './cookies.js'

export const REFRESH_COOKIE = 'hs_rt'
const DAY_MS = 24 * 60 * 60 * 1000
// Token mới vừa bị thay vẫn được chấp nhận trong khoảng ân hạn này (hai tab làm mới cùng lúc)
const REUSE_GRACE_MS = 15 * 1000

const accessTtl = () => process.env.ACCESS_TOKEN_TTL || '15m'
const refreshDays = () => Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30
const maxDays = () => Number(process.env.REFRESH_TOKEN_MAX_DAYS) || 90

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

// Token truy cập ngắn hạn; tv là tokenVersion để thu hồi hàng loạt khi đổi mật khẩu
const generateToken = (userOrId) => {
  const isDoc = userOrId && typeof userOrId === 'object' && userOrId._id
  const id = isDoc ? userOrId._id : userOrId
  const tv = isDoc ? userOrId.tokenVersion || 0 : 0
  return jwt.sign({ id, tv }, process.env.JWT_SECRET, { expiresIn: accessTtl() })
}

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/users',
  maxAge: maxAgeMs,
})

const setRefreshCookie = (res, raw, maxAgeMs) => res.cookie(REFRESH_COOKIE, raw, cookieOptions(maxAgeMs))
export const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(0), maxAge: undefined })

const createRefresh = async (res, user, req, { family, absoluteExpires } = {}) => {
  const raw = crypto.randomBytes(48).toString('hex')
  const now = Date.now()
  const abs = absoluteExpires || new Date(now + maxDays() * DAY_MS)
  const expiresAt = new Date(Math.min(now + refreshDays() * DAY_MS, abs.getTime()))
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(raw),
    family: family || crypto.randomBytes(12).toString('hex'),
    expiresAt,
    absoluteExpires: abs,
    userAgent: String((req && req.headers && req.headers['user-agent']) || '').slice(0, 200),
  })
  setRefreshCookie(res, raw, expiresAt.getTime() - now)
}

// Bắt đầu phiên mới khi đăng nhập hoặc đăng ký: đặt cookie refresh, trả token truy cập
export const startSession = async (req, res, user) => {
  await createRefresh(res, user, req)
  return generateToken(user)
}

// Làm mới: đổi refresh token cũ lấy cái mới. Trả về { user, token } hoặc { error }
export const refreshSession = async (req, res, loadUser) => {
  const raw = parseCookies(req.headers.cookie)[REFRESH_COOKIE]
  if (!raw) return { error: 'Không có phiên đăng nhập.' }

  const rec = await RefreshToken.findOne({ tokenHash: sha256(raw) })
  if (!rec) {
    clearRefreshCookie(res)
    return { error: 'Phiên đăng nhập không hợp lệ.' }
  }

  const now = Date.now()
  if (rec.revokedAt) {
    // Token đã thay mà còn bị dùng lại: trong ân hạn thì chỉ cấp token truy cập, quá ân hạn thì thu hồi cả phiên
    if (now - rec.revokedAt.getTime() <= REUSE_GRACE_MS) {
      const user = await loadUser(rec.user)
      if (user) return { user, token: generateToken(user) }
    } else {
      await RefreshToken.updateMany({ family: rec.family, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } })
    }
    clearRefreshCookie(res)
    return { error: 'Phiên đăng nhập đã hết hiệu lực.' }
  }

  if (rec.expiresAt.getTime() <= now || rec.absoluteExpires.getTime() <= now) {
    clearRefreshCookie(res)
    return { error: 'Phiên đăng nhập đã hết hạn.' }
  }

  const user = await loadUser(rec.user)
  if (!user) {
    clearRefreshCookie(res)
    return { error: 'Không tìm thấy người dùng.' }
  }

  // Thu hồi atomic để hai request cùng lúc không đều thành công
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: rec._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  )
  if (!claimed) {
    return { user, token: generateToken(user) }
  }
  await createRefresh(res, user, req, { family: rec.family, absoluteExpires: rec.absoluteExpires })
  return { user, token: generateToken(user) }
}

// Đăng xuất một thiết bị: thu hồi cả họ token của cookie hiện tại
export const endSession = async (req, res) => {
  const raw = parseCookies(req.headers.cookie)[REFRESH_COOKIE]
  if (raw) {
    const rec = await RefreshToken.findOne({ tokenHash: sha256(raw) })
    if (rec) {
      await RefreshToken.updateMany({ family: rec.family, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } })
    }
  }
  clearRefreshCookie(res)
}

// Đổi mật khẩu, khóa hoặc xóa tài khoản: thu hồi mọi phiên và vô hiệu token truy cập đang sống
export const revokeAllSessions = async (user) => {
  await RefreshToken.deleteMany({ user: user._id })
  if (typeof user.save === 'function') {
    user.tokenVersion = (user.tokenVersion || 0) + 1
    await user.save()
  }
}

export default generateToken
