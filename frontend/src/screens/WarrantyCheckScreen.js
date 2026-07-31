import React, { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

const STATUS_CONFIG = {
  active:       { label: 'Còn bảo hành',        color: '#4cdb80', icon: 'fas fa-shield-alt' },
  expired:      { label: 'Đã hết bảo hành',     color: '#ff6b6b', icon: 'fas fa-times-circle' },
  not_started:  { label: 'Chưa bắt đầu (chưa giao hàng)', color: '#ffd166', icon: 'fas fa-clock' },
  cancelled:    { label: 'Đơn hàng đã bị hủy',  color: '#8a8fa3', icon: 'fas fa-ban' },
}

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

const inputStyle = {
  width: '100%', background: '#0f0f23', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '10px', padding: '12px 16px', color: '#ffffff', fontSize: '14px', outline: 'none',
}

const WarrantyCheckScreen = () => {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!orderId.trim() || !phone.trim()) {
      setError('Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại.')
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.post('/api/orders/warranty-check', {
        orderId: orderId.trim(),
        phone: phone.trim(),
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 8 }}>
        <i className='fas fa-shield-alt me-2' style={{ color: '#33FFCC' }}></i>
        Tra cứu bảo hành
      </h2>
      <p style={{ color: '#b8bcc8', fontSize: 14, marginBottom: 24 }}>
        Nhập mã đơn hàng (xem trong trang chi tiết đơn hàng hoặc email xác nhận) và số điện thoại đã dùng khi đặt hàng để kiểm tra thời hạn bảo hành.
        {' '}
        <Link to='/chinh-sach-bao-hanh' style={{ color: '#33FFCC' }}>Xem chính sách bảo hành đầy đủ →</Link>
      </p>

      <form onSubmit={handleSubmit} style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 24, marginBottom: 24,
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#b8bcc8', fontSize: 13, marginBottom: 6, display: 'block' }}>
            Mã đơn hàng
          </label>
          <input
            type='text'
            placeholder='VD: 6a62da5919b141938ee17b29'
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#b8bcc8', fontSize: 13, marginBottom: 6, display: 'block' }}>
            Số điện thoại đặt hàng
          </label>
          <input
            type='text'
            placeholder='VD: 0901234567'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b',
            borderRadius: 8, padding: '10px 14px', color: '#ff6b6b', fontSize: 13, marginBottom: 16,
          }}>
            <i className='fas fa-exclamation-circle me-2'></i>{error}
          </div>
        )}

        <button
          type='submit'
          disabled={loading}
          style={{
            width: '100%', background: '#33FFCC', border: 'none', borderRadius: 10,
            padding: '12px 24px', color: '#0f0f23', fontWeight: 700, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <><i className='fas fa-spinner fa-spin me-2'></i>Đang kiểm tra...</>
          ) : (
            <><i className='fas fa-search me-2'></i>Kiểm tra bảo hành</>
          )}
        </button>
      </form>

      {result && (
        <div>
          {result.isCancelled ? (
            <div style={{ color: '#8a8fa3', fontSize: 14, marginBottom: 16 }}>
              <i className='fas fa-ban me-2'></i>Đơn hàng này đã bị hủy.
            </div>
          ) : !result.isDelivered ? (
            <div style={{ color: '#ffd166', fontSize: 14, marginBottom: 16 }}>
              <i className='fas fa-clock me-2'></i>Đơn hàng chưa được giao — bảo hành sẽ tính từ ngày giao hàng thành công.
            </div>
          ) : (
            <div style={{ color: '#b8bcc8', fontSize: 14, marginBottom: 16 }}>
              <i className='fas fa-check-circle me-2' style={{ color: '#4cdb80' }}></i>
              Đã giao hàng ngày <strong style={{ color: '#ffffff' }}>{formatDate(result.deliveredAt)}</strong>
            </div>
          )}

          {result.items.map((item, idx) => {
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started
            return (
              <div key={idx} style={{
                display: 'flex', gap: 14, alignItems: 'center',
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${cfg.color}40`,
                borderRadius: 12, padding: 16, marginBottom: 12,
              }}>
                {item.image && (
                  <img src={item.image} alt={item.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 14 }}>
                    {item.name}{item.color ? ` — ${item.color}` : ''}{item.qty > 1 ? ` (x${item.qty})` : ''}
                  </div>
                  <div style={{ color: '#8a8fa3', fontSize: 12, marginTop: 2 }}>
                    Bảo hành {item.warrantyMonths} tháng
                    {item.status === 'active' && item.warrantyEnd && ` — hết hạn ${formatDate(item.warrantyEnd)}`}
                    {item.status === 'expired' && item.warrantyEnd && ` — đã hết hạn từ ${formatDate(item.warrantyEnd)}`}
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  background: `${cfg.color}20`, color: cfg.color, fontWeight: 700, fontSize: 12,
                  padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  <i className={cfg.icon}></i>
                  {cfg.label}
                  {item.status === 'active' && ` — còn ${item.remainingDays} ngày`}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WarrantyCheckScreen