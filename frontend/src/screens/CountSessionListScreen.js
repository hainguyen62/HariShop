import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import { createCountSession, fetchCountSessions } from '../actions/unitActions'

const cardStyle = { background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)', borderRadius: 16, padding: 20, marginBottom: 16 }
const inputStyle = { background: '#0f0f23', color: '#eef0f7', border: '1px solid rgba(51,255,204,0.35)', borderRadius: 8, padding: '8px 10px', fontSize: 14 }
const th = { padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap' }
const td = { padding: '10px 8px' }

const CountSessionListScreen = ({ history: routerHistory }) => {
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token

  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [page, setPage] = useState(1)
  const [list, setList] = useState({ sessions: [], pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchCountSessions(token, { pageNumber: page })
      .then((d) => { setList(d); setError('') })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, page])

  const start = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const s = await createCountSession(token, { name })
      routerHistory.push(`/admin/count-sessions/${s._id}`)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 0 40px' }}>
      <Meta title='Phiên quét kiểm kê' />
      <div style={cardStyle}>
        <h5 style={{ color: '#33FFCC', fontWeight: 700, marginBottom: 6 }}>Phiên quét kiểm kê</h5>
        <p style={{ color: '#b8bcc8', fontSize: 13 }}>
          Mỗi phiên là một đợt đếm kho. Quét tem trên từng máy, mỗi tem quét được cộng 1 cho sản phẩm và màu tương ứng. Chốt phiên để so với tồn hệ thống.
          Cần in tem từng máy ở <Link to='/admin/stock-count?tab=labels' style={{ color: '#33FFCC' }}>tab In tem từng máy</Link>.
        </p>
        <form onSubmit={start} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type='text' value={name} onChange={(e) => setName(e.target.value)} placeholder='Tên phiên (để trống để đặt theo giờ hiện tại)' style={{ ...inputStyle, flex: 1, minWidth: 240 }} />
          <button type='submit' disabled={creating} style={{ background: '#33FFCC', color: '#0f0f23', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700 }}>
            {creating ? 'Đang tạo...' : 'Bắt đầu phiên mới'}
          </button>
        </form>
      </div>

      {error && <Message variant='danger'>{error}</Message>}
      {loading ? <Loader /> : (
        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', color: '#eef0f7', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#33FFCC', borderBottom: '1px solid rgba(51,255,204,0.2)' }}>
                <th style={th}>Phiên</th><th style={th}>Trạng thái</th><th style={th}>Số tem</th><th style={th}>Tạo lúc</th><th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {list.sessions.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#8a8fa3' }}>Chưa có phiên nào</td></tr>
              )}
              {list.sessions.map((s) => (
                <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={td}>{s.name}</td>
                  <td style={{ ...td, color: s.status === 'open' ? '#ffd166' : '#4cdb80' }}>{s.status === 'open' ? 'Đang quét' : 'Đã chốt'}</td>
                  <td style={td}>{s.scanCount}</td>
                  <td style={td}>{new Date(s.createdAt).toLocaleString('vi-VN')}</td>
                  <td style={td}><Link to={`/admin/count-sessions/${s._id}`} style={{ color: '#33FFCC' }}>{s.status === 'open' ? 'Tiếp tục' : 'Xem'}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginate pages={list.pages} page={page} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

export default CountSessionListScreen
