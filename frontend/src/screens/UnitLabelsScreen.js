import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { QRCodeSVG } from 'qrcode.react'
import Meta from '../components/Meta'
import Message from '../components/Message'
import { fetchImportProducts } from '../actions/importActions'
import { fetchUnits, fetchUnitSummary, generateUnits, voidUnits } from '../actions/unitActions'

const cardStyle = { background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)', borderRadius: 16, padding: 20, marginBottom: 16 }
const inputStyle = { background: '#0f0f23', color: '#eef0f7', border: '1px solid rgba(51,255,204,0.35)', borderRadius: 8, padding: '8px 10px', fontSize: 14 }
const labelStyle = { color: '#b8bcc8', fontSize: 12, display: 'block', marginBottom: 4 }
const btn = { background: '#33FFCC', color: '#0f0f23', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700 }

const UnitLabelsScreen = ({ location }) => {
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token
  const query = new URLSearchParams(location.search)

  const [lot, setLot] = useState((query.get('lot') || '').toUpperCase())
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [summary, setSummary] = useState(null)
  const [color, setColor] = useState('')
  const [qty, setQty] = useState('')
  const [units, setUnits] = useState([])
  const [reprinted, setReprinted] = useState(false)
  const [compensate, setCompensate] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const loadLot = async (code) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const list = await fetchUnits(token, { lotCode: code })
      setUnits(list)
      setReprinted(false)
      if (list.length === 0) setInfo('Lô này chưa có tem nào. Lô nhập trước khi có tính năng tem cần sinh tem ở phần bên dưới.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    fetchImportProducts(token).then(setProducts).catch((e) => setError(e.message))
    if (lot) loadLot(lot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickProduct = async (id) => {
    setProductId(id)
    setSummary(null)
    setColor('')
    setQty('')
    if (!id) return
    try {
      const s = await fetchUnitSummary(token, id)
      setSummary(s)
      const first = s.colors[0]
      setColor(first.color)
      setQty(String(Math.max(0, first.stock - first.units)))
    } catch (e) {
      setError(e.message)
    }
  }

  const pickColor = (name) => {
    setColor(name)
    const c = summary.colors.find((x) => x.color === name)
    if (c) setQty(String(Math.max(0, c.stock - c.units)))
  }

  const generate = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const r = await generateUnits(token, { productId, color, quantity: Number(qty), compensate, reason })
      setUnits(r.units.map((u) => ({ ...u, productName: summary.name })))
      setReprinted(false)
      setInfo(`Đã sinh ${r.units.length} tem. Bấm In tem để in.`)
      setSummary(await fetchUnitSummary(token, productId))
      setCompensate(false)
      setReason('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const reprint = async () => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const list = await fetchUnits(token, { productId, color, status: 'in_stock' })
      setUnits(list)
      setReprinted(true)
      setInfo(list.length ? `Đã tải ${list.length} tem còn trong kho, mã giữ nguyên. Bấm In tem để in lại.` : 'Không có tem nào còn trong kho cho màu này.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const voidShown = async () => {
    if (!reason.trim()) { setError('Ghi lý do tem hỏng hoặc mất trước khi hủy tem'); return }
    if (!window.confirm(`Hủy ${units.length} tem đang hiển thị? Mã đã hủy không dùng lại.`)) return
    setBusy(true)
    setError('')
    try {
      const r = await voidUnits(token, { codes: units.map((u) => u.code), reason })
      setInfo(`Đã hủy ${r.voided} tem. Mã đã hủy không dùng lại, có thể sinh tem mới để thay.`)
      setUnits([])
      setSummary(await fetchUnitSummary(token, productId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 0 40px' }}>
      <Meta title='In tem từng máy' />
      <style>{`
        @media screen { .unit-print-area { display: none; } }
        @media print {
          body * { visibility: hidden; }
          .unit-print-area, .unit-print-area * { visibility: visible; }
          .unit-print-area { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; padding: 6mm; }
          .unit-label { border: 1px dashed #666; padding: 2mm; text-align: center; color: #000; background: #fff; page-break-inside: avoid; font-size: 7pt; line-height: 1.25; }
          .unit-label b { display: block; font-size: 8pt; word-break: break-word; }
        }
      `}</style>

      <div style={cardStyle}>
        <h5 style={{ color: '#33FFCC', fontWeight: 700, marginBottom: 6 }}>In tem từng máy</h5>
        <p style={{ color: '#b8bcc8', fontSize: 13, marginBottom: 0 }}>
          Mỗi máy có một tem QR riêng. Nhập hàng xong, hệ thống tự sinh tem cho lô đó. Hàng đã có trong kho từ trước thì sinh tem ở phần thứ hai.
          Dán tem lên từng máy, sau đó quét trong phiên kiểm kê.
        </p>
      </div>

      {error && <Message variant='danger'>{error}</Message>}
      {info && <Message variant='info'>{info}</Message>}

      <div style={cardStyle}>
        <h6 style={{ color: '#fff', marginBottom: 10 }}>1. Tem của một lô nhập</h6>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type='text' value={lot} onChange={(e) => setLot(e.target.value.toUpperCase())} placeholder='VD: LO-261005-0001' style={{ ...inputStyle, minWidth: 240 }} />
          <button type='button' style={btn} disabled={busy || !lot.trim()} onClick={() => loadLot(lot.trim())}>Tải tem</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h6 style={{ color: '#fff', marginBottom: 10 }}>2. Sinh tem cho hàng có sẵn trong kho</h6>
        <form onSubmit={generate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Sản phẩm</label>
            <select value={productId} onChange={(e) => pickProduct(e.target.value)} style={{ ...inputStyle, minWidth: 240 }}>
              <option value=''>Chọn sản phẩm</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          {summary && (
            <>
              <div>
                <label style={labelStyle}>Màu</label>
                <select value={color} onChange={(e) => pickColor(e.target.value)} style={inputStyle}>
                  {summary.colors.map((c) => (
                    <option key={c.color} value={c.color}>
                      {(c.color || 'Không có màu')} (tồn {c.stock}, tem còn trong kho {c.units}, đã bán {c.sold || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Số tem</label>
                <input type='number' min='1' max='500' value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...inputStyle, width: 100 }} />
              </div>
              <button type='submit' style={btn} disabled={busy || !qty}>Sinh tem</button>
              <button type='button' style={{ ...btn, background: 'transparent', color: '#33FFCC', border: '1px solid #33FFCC' }} disabled={busy} onClick={reprint}>In lại tem</button>
            </>
          )}
        </form>
        {summary && (
          <div style={{ marginTop: 12 }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type='checkbox' checked={compensate} onChange={(e) => setCompensate(e.target.checked)} />
              In bù tem hỏng hoặc mất (cho phép vượt tồn)
            </label>
            {(compensate || units.length > 0) && (
              <input type='text' value={reason} onChange={(e) => setReason(e.target.value)} placeholder='Lý do, VD: tem bị ướt' style={{ ...inputStyle, width: '100%', maxWidth: 420 }} />
            )}
          </div>
        )}
        {summary && <div style={{ color: '#8a8fa3', fontSize: 12, marginTop: 8 }}>Số tem gợi ý là phần tồn kho chưa có tem. Hệ thống chặn sinh vượt tồn. Mỗi lần sinh tối đa 500 tem.</div>}
      </div>

      {units.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h6 style={{ color: '#fff', margin: 0 }}>{units.length} tem sẵn sàng in</h6>
            <div style={{ display: 'flex', gap: 8 }}>
              {summary && reprinted && <button type='button' style={{ ...btn, background: '#ff6b6b', color: '#fff' }} disabled={busy} onClick={voidShown}>Hủy các tem này</button>}
              <button type='button' style={btn} onClick={() => window.print()}><i className='fas fa-print me-2'></i>In tem</button>
            </div>
          </div>
          <div style={{ color: '#b8bcc8', fontSize: 12 }}>Mã đầu: {units[0].code} · mã cuối: {units[units.length - 1].code}</div>
        </div>
      )}

      <div className='unit-print-area'>
        {units.map((u) => (
          <div className='unit-label' key={u.code}>
            <QRCodeSVG value={u.code} size={84} />
            <b>{u.code}</b>
            <span>{u.productName}{u.color ? ` · ${u.color}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UnitLabelsScreen
