import React, { useCallback, useEffect, useRef, useState } from 'react'
import QrScanner from './QrScanner'
import {
  fetchOrderExport, scanOrderExport, removeOrderExportScan, completeOrderExport,
} from '../actions/unitActions'

const box = { background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.3)', borderRadius: 16, padding: 20, marginBottom: 16 }
const inputStyle = {
  background: '#0f0f23', color: '#eef0f7', border: '1px solid rgba(51,255,204,0.35)',
  borderRadius: 8, padding: '8px 10px', fontSize: 15, flex: 1,
}
const COLORS = { ok: '#4cdb80', err: '#ff6b6b' }

// Khung xuất kho: quét tem từng máy, đủ số lượng mới hoàn tất để tạo vận đơn
const OrderExportPanel = ({ orderId, token, status, onDone }) => {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [manual, setManual] = useState('')
  const [camera, setCamera] = useState(false)
  const [confirmManual, setConfirmManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const chain = useRef(Promise.resolve())

  const load = useCallback(async () => {
    try {
      setData(await fetchOrderExport(token, orderId))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [token, orderId])

  useEffect(() => {
    load()
  }, [load, status])

  // Xử lý lần lượt từng tem để không lẫn kết quả khi quét nhanh
  const handleCode = (text) => {
    chain.current = chain.current.then(async () => {
      try {
        const r = await scanOrderExport(token, orderId, text)
        if (navigator.vibrate) navigator.vibrate(60)
        setData(r)
        setFeedback({ type: 'ok', text: `Đã nhận tem ${r.code}` })
      } catch (e) {
        setFeedback({ type: 'err', text: e.message })
      }
    })
  }

  const submitManual = (e) => {
    e.preventDefault()
    const v = manual.trim()
    if (!v) return
    handleCode(v)
    setManual('')
  }

  const remove = async (code) => {
    try {
      setData(await removeOrderExportScan(token, orderId, code))
      setFeedback({ type: 'ok', text: `Đã bỏ tem ${code}` })
    } catch (e) {
      setFeedback({ type: 'err', text: e.message })
    }
  }

  const complete = async () => {
    if (!window.confirm('Hoàn tất xuất kho? Các máy đã quét sẽ chuyển sang đã bán và đơn được gửi cho đơn vị vận chuyển.')) return
    setBusy(true)
    try {
      setData(await completeOrderExport(token, orderId, { confirmManual }))
      setCamera(false)
      setFeedback(null)
      if (onDone) onDone()
    } catch (e) {
      setFeedback({ type: 'err', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  if (!data) return error ? <div style={{ ...box, color: '#ff6b6b' }}>{error}</div> : null
  if (!data.exportRequired) return null

  if (data.exported) {
    return (
      <div style={{ ...box, border: '1px solid rgba(76,219,128,0.4)' }}>
        <h6 style={{ color: '#4cdb80', fontWeight: 700 }}><i className='fas fa-dolly me-2'></i>Đã xuất kho</h6>
        <div style={{ color: '#b8bcc8', fontSize: 13 }}>
          Lúc {new Date(data.exportedAt).toLocaleString('vi-VN')}, {data.unitCodes.length} máy quét tem
          {data.exportManualQty > 0 ? `, ${data.exportManualQty} máy xuất thủ công` : ''}.
        </div>
        {data.unitCodes.length > 0 && (
          <div style={{ color: '#eef0f7', fontSize: 12, marginTop: 8, wordBreak: 'break-all' }}>{data.unitCodes.join(', ')}</div>
        )}
      </div>
    )
  }

  return (
    <div style={box}>
      <h6 style={{ color: '#33FFCC', fontWeight: 700, marginBottom: 12 }}><i className='fas fa-qrcode me-2'></i>Xuất kho bằng quét tem</h6>
      {data.blocked ? (
        <div style={{ color: '#ffd166', fontSize: 14 }}>{data.blocked}</div>
      ) : (
        <>
          {feedback && (
            <div style={{ border: `2px solid ${COLORS[feedback.type]}`, color: COLORS[feedback.type], borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontWeight: 700, fontSize: 14 }}>
              {feedback.text}
            </div>
          )}
          <button type='button' onClick={() => setCamera(!camera)} style={{ background: 'transparent', border: '1px solid #33FFCC', color: '#33FFCC', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
            <i className={`fas fa-${camera ? 'video-slash' : 'camera'} me-2`}></i>{camera ? 'Tắt camera' : 'Bật camera'}
          </button>
          <QrScanner active={camera} onScan={handleCode} />
          <form onSubmit={submitManual} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
            <input type='text' value={manual} onChange={(e) => setManual(e.target.value)} placeholder='Nhập hoặc quét mã tem bằng máy quét, rồi Enter' style={inputStyle} />
            <button type='submit' style={{ background: '#33FFCC', color: '#0f0f23', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700 }}>Thêm</button>
          </form>
        </>
      )}

      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', color: '#eef0f7', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#33FFCC', borderBottom: '1px solid rgba(51,255,204,0.2)', textAlign: 'left' }}>
              <th style={{ padding: 6 }}>Sản phẩm</th>
              <th style={{ padding: 6 }}>Màu</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Cần quét</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Đã quét</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={l.index} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: 6 }}>
                  {l.name} <span style={{ color: '#8a8fa3' }}>× {l.qty}</span>
                  {l.manual > 0 && <div style={{ color: '#ffd166', fontSize: 12 }}>{l.manual} máy chưa có tem</div>}
                </td>
                <td style={{ padding: 6 }}>{l.color || '—'}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{l.needScan}</td>
                <td style={{ padding: 6, textAlign: 'right', fontWeight: 700, color: l.done ? '#4cdb80' : '#ffd166' }}>{l.scanned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.scans.length > 0 && !data.blocked && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#b8bcc8' }}>
          {data.scans.map((s) => (
            <span key={s.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 8px', margin: '0 6px 6px 0' }}>
              {s.code}
              <button type='button' onClick={() => remove(s.code)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', padding: 0 }} title='Bỏ tem này'>×</button>
            </span>
          ))}
        </div>
      )}

      {!data.blocked && (
        <>
          {data.manualTotal > 0 && (
            <label style={{ color: '#ffd166', fontSize: 13, display: 'block', marginTop: 12 }}>
              <input type='checkbox' checked={confirmManual} onChange={(e) => setConfirmManual(e.target.checked)} className='me-2' />
              Xác nhận {data.manualTotal} máy chưa có tem trong kho, xuất thủ công không quét
            </label>
          )}
          <button
            type='button' onClick={complete}
            disabled={!data.canComplete || busy || (data.manualTotal > 0 && !confirmManual)}
            style={{ width: '100%', marginTop: 14, background: '#33FFCC', color: '#0f0f23', border: 'none', borderRadius: 12, padding: 12, fontWeight: 700, opacity: (!data.canComplete || busy || (data.manualTotal > 0 && !confirmManual)) ? 0.5 : 1 }}
          >
            {busy ? 'Đang xử lý...' : 'Hoàn tất xuất kho'}
          </button>
        </>
      )}
    </div>
  )
}

export default OrderExportPanel
