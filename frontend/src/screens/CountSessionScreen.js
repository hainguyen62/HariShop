import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import QrScanner from '../components/QrScanner'
import { fetchCountSession, scanUnit, undoScan, closeCountSession } from '../actions/unitActions'

const cardStyle = { background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)', borderRadius: 16, padding: 20, marginBottom: 16 }
const inputStyle = {
  background: '#0f0f23', color: '#eef0f7', border: '1px solid rgba(51,255,204,0.35)',
  borderRadius: 8, padding: '8px 10px', fontSize: 15,
}
const cell = { padding: '8px 8px' }
const FEEDBACK_COLOR = { ok: '#4cdb80', dup: '#ffd166', err: '#ff6b6b', bad: '#ff6b6b' }

const diffColor = (d) => (d === 0 ? '#4cdb80' : d < 0 ? '#ff6b6b' : '#ffd166')

const RowsTable = ({ rows }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', color: '#eef0f7', fontSize: 14, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: '#33FFCC', borderBottom: '1px solid rgba(51,255,204,0.2)', textAlign: 'left' }}>
          <th style={cell}>Sản phẩm</th>
          <th style={cell}>Màu</th>
          <th style={{ ...cell, textAlign: 'right' }}>Hệ thống</th>
          <th style={{ ...cell, textAlign: 'right' }}>Đã quét</th>
          <th style={{ ...cell, textAlign: 'right' }}>Chênh lệch</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={5} style={{ ...cell, textAlign: 'center', color: '#8a8fa3' }}>Chưa quét tem nào</td></tr>
        )}
        {rows.map((r) =>
          r.lines.map((l, i) => (
            <tr key={`${r.productId}-${l.color}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={cell}>
                {i === 0 ? (<><div>{r.name}</div><div style={{ color: '#8a8fa3', fontSize: 12 }}>{r.productCode}</div></>) : ''}
              </td>
              <td style={cell}>{l.color || '—'}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{l.systemQty}</td>
              <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{l.countedQty}</td>
              <td style={{ ...cell, textAlign: 'right', color: diffColor(l.diff), fontWeight: 700 }}>{l.diff > 0 ? `+${l.diff}` : l.diff}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)

const CountSessionScreen = ({ match }) => {
  const sessionId = match.params.id
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [manual, setManual] = useState('')
  const [camera, setCamera] = useState(true)
  const [includeUnscanned, setIncludeUnscanned] = useState(false)
  const [adjust, setAdjust] = useState(false)
  const [note, setNote] = useState('')
  const [closing, setClosing] = useState(false)
  const chain = useRef(Promise.resolve())
  const includeRef = useRef(false)

  const load = useCallback(async () => {
    try {
      setData(await fetchCountSession(token, sessionId, includeRef.current))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, sessionId])

  useEffect(() => {
    includeRef.current = includeUnscanned
    load()
  }, [includeUnscanned, load])

  // Xử lý lần lượt từng tem để không lẫn kết quả khi quét nhanh
  const handleCode = (text) => {
    chain.current = chain.current.then(async () => {
      try {
        const r = await scanUnit(token, sessionId, text)
        if (navigator.vibrate) navigator.vibrate(60)
        setFeedback({ type: 'ok', text: `${r.productName}${r.color ? ` (${r.color})` : ''}: đã quét ${r.counted}, hệ thống ${r.systemQty}`, code: r.code })
        await load()
      } catch (e) {
        if (e.abnormal) {
          setFeedback({ type: 'bad', text: `${e.message}. Không tính vào số đã quét.` })
          await load()
        } else if (e.duplicate) {
          setFeedback({ type: 'dup', text: `Tem đã quét rồi: ${e.detail.productName}${e.detail.color ? ` (${e.detail.color})` : ''}`, code: e.detail.code })
        } else {
          setFeedback({ type: 'err', text: e.message })
        }
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

  const undo = async (code) => {
    try {
      await undoScan(token, sessionId, code)
      setFeedback({ type: 'ok', text: `Đã bỏ lần quét ${code}` })
      await load()
    } catch (e) {
      setFeedback({ type: 'err', text: e.message })
    }
  }

  const close = async () => {
    const msg = adjust
      ? 'Chốt phiên và CHỈNH tồn kho theo số đã quét? Thao tác này không hoàn lại được.'
      : 'Chốt phiên và chỉ ghi nhận chênh lệch (không đổi tồn kho)?'
    if (!window.confirm(msg)) return
    setClosing(true)
    try {
      await closeCountSession(token, sessionId, { applyAdjustment: adjust, includeUnscanned, note })
      setCamera(false)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <Loader />
  const open = data && data.status === 'open'
  const rows = data ? data.rows : []

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 0 40px' }}>
      <Meta title='Phiên quét kiểm kê' />
      <Link to='/admin/stock-count?tab=sessions' style={{ color: '#33FFCC', fontSize: 13 }}>← Danh sách phiên</Link>
      {error && <Message variant='danger'>{error}</Message>}
      {data && (
        <>
          <div style={cardStyle}>
            <h5 style={{ color: '#33FFCC', fontWeight: 700, marginBottom: 4 }}>{data.name}</h5>
            <div style={{ color: '#b8bcc8', fontSize: 13 }}>
              {open ? 'Đang quét' : 'Đã chốt'} · {data.scanCount} tem đã quét
              {data.result && <> · {data.result.adjusted ? 'đã chỉnh tồn kho' : 'chỉ ghi nhận chênh lệch'}</>}
            </div>
          </div>

          {open && (
            <div style={cardStyle}>
              {feedback && (
                <div style={{ border: `2px solid ${FEEDBACK_COLOR[feedback.type]}`, color: FEEDBACK_COLOR[feedback.type], borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontWeight: 700 }}>
                  {feedback.text}
                  {feedback.type === 'ok' && feedback.code && (
                    <button type='button' onClick={() => undo(feedback.code)} style={{ marginLeft: 12, background: 'transparent', border: '1px solid currentColor', color: 'inherit', borderRadius: 6, fontSize: 12, padding: '2px 8px' }}>
                      Hoàn tác
                    </button>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <button type='button' onClick={() => setCamera(!camera)} style={{ background: 'transparent', border: '1px solid #33FFCC', color: '#33FFCC', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13 }}>
                  <i className={`fas fa-${camera ? 'video-slash' : 'camera'} me-2`}></i>{camera ? 'Tắt camera' : 'Bật camera'}
                </button>
              </div>
              <QrScanner active={camera} onScan={handleCode} />
              <form onSubmit={submitManual} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <input
                  type='text' value={manual} onChange={(e) => setManual(e.target.value)} autoFocus
                  placeholder='Nhập hoặc quét mã tem bằng máy quét, rồi Enter' style={{ ...inputStyle, flex: 1 }}
                />
                <button type='submit' style={{ background: '#33FFCC', color: '#0f0f23', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700 }}>Thêm</button>
              </form>
            </div>
          )}

          <div style={cardStyle}>
            <h6 style={{ color: '#fff', marginBottom: 12 }}>{open ? 'Tiến độ theo sản phẩm' : 'Kết quả'}</h6>
            <RowsTable rows={rows} />
            {open && (
              <label style={{ color: '#b8bcc8', fontSize: 13, marginTop: 12, display: 'block' }}>
                <input type='checkbox' checked={includeUnscanned} onChange={(e) => setIncludeUnscanned(e.target.checked)} className='me-2' />
                Tính cả sản phẩm chưa quét tem nào (coi như đếm được 0)
              </label>
            )}
          </div>

          {data.anomalies && data.anomalies.length > 0 && (
            <div style={{ ...cardStyle, borderColor: 'rgba(255,107,107,0.5)' }}>
              <h6 style={{ color: '#ff6b6b', marginBottom: 12 }}>Tem bất thường ({data.anomalies.length})</h6>
              {data.anomalies.map((a) => (
                <div key={a.code} style={{ padding: '6px 0', color: '#eef0f7', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>{a.productName}{a.color ? ` (${a.color})` : ''} <span style={{ color: '#8a8fa3' }}>{a.code}</span></div>
                  <div style={{ color: '#ff9b9b' }}>{a.reason}</div>
                </div>
              ))}
            </div>
          )}

          {open && data.recent.length > 0 && (
            <div style={cardStyle}>
              <h6 style={{ color: '#fff', marginBottom: 12 }}>Quét gần nhất</h6>
              {data.recent.map((r) => (
                <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', color: '#eef0f7', fontSize: 13 }}>
                  <span>{r.productName}{r.color ? ` (${r.color})` : ''} <span style={{ color: '#8a8fa3' }}>{r.code}</span></span>
                  <button type='button' onClick={() => undo(r.code)} style={{ background: 'transparent', border: 'none', color: '#ff9b9b' }} title='Bỏ lần quét này'>✕</button>
                </div>
              ))}
            </div>
          )}

          {open && (
            <div style={cardStyle}>
              <h6 style={{ color: '#fff', marginBottom: 12 }}>Chốt phiên</h6>
              <input type='text' value={note} onChange={(e) => setNote(e.target.value)} placeholder='Ghi chú (không bắt buộc)' style={{ ...inputStyle, width: '100%', marginBottom: 10 }} />
              <label style={{ color: '#eef0f7', fontSize: 14, display: 'block', marginBottom: 12 }}>
                <input type='checkbox' checked={adjust} onChange={(e) => setAdjust(e.target.checked)} className='me-2' />
                Chỉnh tồn kho theo số đã quét
              </label>
              <button type='button' onClick={close} disabled={closing || data.scanCount === 0} style={{ background: '#33FFCC', color: '#0f0f23', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, opacity: data.scanCount === 0 ? 0.5 : 1 }}>
                {closing ? 'Đang chốt...' : 'Chốt phiên kiểm kê'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CountSessionScreen
