import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { fetchCountProduct, createStockCount } from '../actions/stockCountActions'

const cardStyle = {
  background: '#1a1a2e',
  border: '1px solid rgba(51,255,204,0.15)',
  borderRadius: 16,
  padding: 20,
}
const inputStyle = {
  width: 110,
  background: '#0f0f23',
  color: '#eef0f7',
  border: '1px solid rgba(51,255,204,0.35)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 15,
  textAlign: 'right',
}
const cell = { padding: '10px 8px' }

// Trang mở khi quét QR trên tem sản phẩm
const StockCheckScreen = ({ match }) => {
  const productId = match.params.id
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token

  const [product, setProduct] = useState(null)
  const [counted, setCounted] = useState({})
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const p = await fetchCountProduct(token, productId)
      setProduct(p)
      setCounted({})
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const rows = product
    ? product.colors?.length
      ? product.colors.map((c) => ({ key: c.name, color: c.name, hex: c.hexCode, system: c.countInStock }))
      : [{ key: '', color: '', hex: '', system: product.countInStock }]
    : []

  const valueOf = (key) => counted[key]
  const filled = rows.filter((r) => valueOf(r.key) !== undefined && valueOf(r.key) !== '')
  const totalDiff = filled.reduce((sum, r) => sum + (Number(valueOf(r.key)) - r.system), 0)

  const submit = async (applyAdjustment) => {
    setError('')
    setResult(null)
    if (filled.length === 0) return setError('Nhập số đếm thực tế cho ít nhất một dòng')
    if (applyAdjustment && totalDiff !== 0) {
      const ok = window.confirm(`Tồn kho trên hệ thống sẽ được chỉnh theo số đếm (lệch ${totalDiff > 0 ? '+' : ''}${totalDiff}). Tiếp tục?`)
      if (!ok) return
    }
    setSaving(true)
    try {
      const record = await createStockCount(token, {
        productId,
        note,
        applyAdjustment,
        lines: filled.map((r) => ({ color: r.color, countedQty: Number(valueOf(r.key)) })),
      })
      setResult(record)
      setNote('')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Meta title='Kiểm kê sản phẩm' />
      <Link to='/admin/stock-count' style={{ color: '#33FFCC', fontSize: 14 }}>
        <i className='fas fa-arrow-left me-2'></i>Danh sách kiểm kê
      </Link>
      <h2 style={{ color: '#ffffff', fontWeight: 700, margin: '12px 0 20px' }}>
        <i className='fas fa-clipboard-check me-2' style={{ color: '#33FFCC' }}></i>Kiểm kê sản phẩm
      </h2>

      {error && <Message variant='danger'>{error}</Message>}
      {result && (
        <Message variant={result.totalDiff === 0 ? 'success' : 'warning'}>
          Đã lưu phiếu kiểm kê: {result.totalDiff === 0 ? 'số đếm khớp với hệ thống' : `lệch ${result.totalDiff > 0 ? '+' : ''}${result.totalDiff}`}
          {result.adjusted ? ', tồn kho đã được chỉnh theo số đếm.' : '.'}
        </Message>
      )}

      {loading ? (
        <Loader />
      ) : product ? (
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
            {product.image && <img src={product.image} alt={product.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} />}
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{product.name}</div>
              {product.productCode && <div style={{ color: '#33FFCC', fontSize: 13 }}>{product.productCode}</div>}
              <div style={{ color: '#b8bcc8', fontSize: 13 }}>
                Tồn hệ thống: <strong style={{ color: '#eef0f7' }}>{product.countInStock}</strong>
                {product.lastCount && <> · Kiểm kê gần nhất: {new Date(product.lastCount.countedAt).toLocaleDateString('vi-VN')}</>}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#0f0f23', color: '#33FFCC' }}>
                  <th style={{ ...cell, textAlign: 'left' }}>Màu</th>
                  <th style={{ ...cell, textAlign: 'right' }}>Tồn hệ thống</th>
                  <th style={{ ...cell, textAlign: 'right' }}>Số đếm thực tế</th>
                  <th style={{ ...cell, textAlign: 'right' }}>Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = valueOf(r.key)
                  const has = v !== undefined && v !== ''
                  const diff = has ? Number(v) - r.system : null
                  return (
                    <tr key={r.key || 'all'} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={cell}>
                        {r.hex && <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: r.hex, border: '1px solid rgba(255,255,255,0.3)', marginRight: 8, verticalAlign: 'middle' }} />}
                        {r.color || 'Tất cả'}
                      </td>
                      <td style={{ ...cell, textAlign: 'right' }}>{r.system}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>
                        <input type='number' min='0' step='1' inputMode='numeric' value={v ?? ''} style={inputStyle}
                          onChange={(e) => setCounted({ ...counted, [r.key]: e.target.value })} />
                      </td>
                      <td style={{ ...cell, textAlign: 'right', fontWeight: 700, color: diff === null ? '#8a8fa3' : diff === 0 ? '#4cdb80' : '#ff6b6b' }}>
                        {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ color: '#b8bcc8', fontSize: 12, display: 'block', marginBottom: 4 }}>Ghi chú (nguyên nhân lệch, người kiểm...)</label>
            <input type='text' value={note} onChange={(e) => setNote(e.target.value)}
              style={{ ...inputStyle, width: '100%', textAlign: 'left', fontSize: 14 }} />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 18 }}>
            <button type='button' disabled={saving} onClick={() => submit(false)}
              style={{ background: 'transparent', border: '1px solid #33FFCC', borderRadius: 8, padding: '10px 20px', color: '#33FFCC', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
              Lưu phiếu, giữ nguyên tồn kho
            </button>
            <button type='button' disabled={saving} onClick={() => submit(true)}
              style={{ background: '#33FFCC', border: 'none', borderRadius: 8, padding: '10px 20px', color: '#0f0f23', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
              Lưu và chỉnh tồn kho theo số đếm
            </button>
            {filled.length > 0 && (
              <span style={{ color: totalDiff === 0 ? '#4cdb80' : '#ffd166' }}>
                Tổng chênh lệch: <strong>{totalDiff > 0 ? `+${totalDiff}` : totalDiff}</strong>
              </span>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

export default StockCheckScreen
