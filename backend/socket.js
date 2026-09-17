import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import User from './models/userModel.js'

// ═══════════════════ B9: Thông báo real-time bằng Socket.io ═══════════════════ Mỗi client khi kết nối sẽ gửi kèm JWT token (event 'auth') để server xác thực

let io = null

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Dev/đồ án — mở cho mọi origin. Siết lại domain cụ thể khi deploy thật.
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    socket.on('auth', async (token) => {
      try {
        if (!token) return
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id).select('isAdmin')
        if (!user) return

        socket.join(`user:${decoded.id}`)
        if (user.isAdmin) socket.join('admin')
      } catch (err) {
        // Token không hợp lệ/hết hạn — bỏ qua, socket vẫn kết nối bình thường,
        // chỉ là không nhận được thông báo real-time cho tới khi đăng nhập lại.
      }
    })

    socket.on('disconnect', () => {
      // Không cần xử lý gì thêm — Socket.io tự dọn socket khỏi mọi room khi ngắt kết nối.
    })
  })

  return io
}

export const getIO = () => io

// Gửi 1 thông báo tới đúng room — dùng trong createNotification() ngay sau khi lưu DB.
// `notification.user` có giá trị → gửi riêng cho khách đó. Ngược lại → gửi cho Admin.
export const emitNotification = (notification) => {
  if (!io) return // Socket.io chưa khởi tạo (vd môi trường test) — bỏ qua, không throw lỗi
  try {
    if (notification.user) {
      io.to(`user:${notification.user.toString()}`).emit('notification:new', notification)
    } else {
      io.to('admin').emit('notification:new', notification)
    }
  } catch (err) {
    console.error('⚠️ Lỗi emit socket notification:', err.message)
  }
}
