import asyncHandler from 'express-async-handler'
import User from '../models/userModel.js'
import { refreshSession, endSession } from '../utils/generateToken.js'

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  isAdmin: user.isAdmin,
  addresses: user.addresses,
  codRestricted: user.codRestricted,
  codFailCount: user.codFailCount,
})

// @desc    Đổi refresh token (cookie) lấy token truy cập mới
// @route   POST /api/users/refresh
// @access  Public (cần cookie hợp lệ)
const refreshToken = asyncHandler(async (req, res) => {
  const result = await refreshSession(req, res, (id) => User.findById(id))
  if (result.error) {
    res.status(401)
    throw new Error(result.error)
  }
  res.json({ ...publicUser(result.user), token: result.token })
})

// @desc    Đăng xuất: thu hồi phiên của thiết bị này
// @route   POST /api/users/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
  await endSession(req, res)
  res.json({ message: 'Đã đăng xuất.' })
})

export { refreshToken, logoutUser }
