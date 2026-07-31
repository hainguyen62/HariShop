import express from 'express'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import cloudinary from '../config/cloudinary.js'
import { protect, admin } from '../middleware/authMiddleware.js'
import { checkRateLimit } from '../utils/rateLimit.js'

const router = express.Router()

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'harishop',            // tất cả ảnh gom vào 1 thư mục trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'],
    // Giới hạn kích thước tối đa 1200x1200, giữ tỉ lệ, không phóng to ảnh nhỏ hơn
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    // Tên file ngẫu nhiên để tránh trùng, giữ nguyên logic cũ (fieldname + timestamp)
    public_id: (req, file) => {
      const base = file.fieldname || 'image'
      return `${base}-${Date.now()}`
    },
  },
})

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/
  const extnameOk = filetypes.test(file.originalname.toLowerCase())
  const mimetypeOk = filetypes.test(file.mimetype)

  if (extnameOk && mimetypeOk) {
    return cb(null, true)
  } else {
    cb(new Error('Images only!'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB/ảnh
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb)
  },
})

// ── MỚI: route này trước đây KHÔNG có middleware xác thực nào — bất kỳ ai,
// kể cả chưa đăng nhập, đều gọi thẳng API này để upload ảnh lên Cloudinary
// (tốn dung lượng/băng thông, rủi ro bị lợi dụng chứa nội dung tuỳ ý). Chỉ
// 2 màn hình admin (thêm/sửa sản phẩm) dùng route này nên gắn cả protect +
// admin, đồng thời giới hạn tần suất để tránh spam ngay cả khi tài khoản
// admin bị lộ.
router.post('/', protect, admin, (req, res, next) => {
  if (!checkRateLimit(`upload_${req.user._id}`, 30, 10 * 60 * 1000)) {
    res.status(429)
    return next(new Error('Bạn upload ảnh quá nhanh, vui lòng thử lại sau ít phút.'))
  }
  next()
}, upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Không có file ảnh nào được tải lên.')
  }

  res.send(req.file.path)
})

export default router