import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import ListFilterBar from '../components/ListFilterBar'
import { useListControls } from '../utils/listControls'
import {
  fetchAgingStock, setProductAgingThreshold, fetchInventorySettings, updateInventorySettings,
} from '../actions/inventoryActions'

const cardStyle = { background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)', borderRadius: 16, padding: 20, marginBottom: 24 }
const inputStyle = { width: 90, background: '#0f0f23', color: '#eef0f7', border: '1px solid rgba(51,255,204,0.35)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }
const th = { padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap', userSelect: 'none' }
const td = { padding: '10px 8px' }

const DEFAULT_FILTERS = { keyword: '', status: 'over', custom: '', minDays: '', maxDays: '' }
const FILTER_FIELDS = [
  { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên sản phẩm' },
  {
    key: 'status', label: 'Trạng thái', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, { value: 'over', label: 'Vượt ngưỡng' }, { value: 'ok', label: 'Trong ngưỡng' }],
  },
  {
    key: 'custom', label: 'Ngưỡng riêng', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, { value: 'yes', label: 'Có đặt ngưỡng riêng' }],
  },
  { key: 'minDays', label: 'Tuổi tồn từ (ngày)', type: 'number', advanced: true },
  { key: 'maxDays', label: 'Tuổi tồn đến (ngày)', type: 'number', advanced: true },
]

const COLUMNS = [
  { label: 'Sản phẩm', sortKey: 'name' },
  { label: 'Tồn', sortKey: 'stock' },
  { label: 'Lô cũ nhất nhập' },
  { label: 'Tuổi tồn (ngày)', sortKey: 'ageDays' },
  { label: 'Bán gần nhất', sortKey: 'daysSinceSale' },
  { label: 'Ngưỡng (ngày)', sortKey: 'threshold' },
  { label: 'Vượt', sortKey: 'overBy' },
  { label: 'Trạng thái' },
]

const AgingStockScreen = () => {
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token

  const { filters, applyFilters, sortConfig, handleSort, page, setPage, params, paramsKey } = useListControls(DEFAULT_FILTERS)
  const [data, setData] = useState({ items: [], pages: 1, total: 0, summary: { overCount: 0, totalCount: 0, overStock: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [globalDays, setGlobalDays] = useState('')
  const [drafts, setDrafts] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchAgingStock(token, params))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, paramsKey])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetchInventorySettings(token).then((s) => setGlobalDays(String(s.agingThresholdDays))).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!loading && data.items.length === 0 && page > 1) setPage(page - 1)
  }, [loading, data.items.length, page, setPage])

  const saveGlobal = async () => {
    setError('')
    setNotice('')
    try {
      await updateInventorySettings(token, { agingThresholdDays: Number(globalDays) })
      setNotice('Đã lưu ngưỡng chung')
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  const saveProduct = async (row) => {
    setError('')
    setNotice('')
    try {
      await setProductAgingThreshold(token, row.productId, Number(drafts[row.productId]))
      setDrafts((d) => { const next = { ...d }; delete next[row.productId]; return next })
      setNotice(`Đã lưu ngưỡng cho ${row.name}`)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <Meta title='Cảnh báo tồn kho lâu' />
      <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 6 }}>
        <i className='fas fa-hourglass-half me-2' style={{ color: '#ffd166' }}></i>Cảnh báo tồn kho lâu
      </h2>
      <p style={{ color: '#b8bcc8', fontSize: 13, marginBottom: 20 }}>
        Tuổi tồn tính từ ngày nhập của lô cũ nhất còn hàng, theo nguyên tắc nhập trước bán trước. Phần tồn chưa có phiếu nhập được tính từ ngày tạo sản phẩm.
        Hệ thống quét 6 giờ một lần và gửi thông báo cho admin, mỗi sản phẩm nhắc lại sau 7 ngày.
      </p>

      {error && <Message variant='danger'>{error}</Message>}
      {notice && <Message variant='success'>{notice}</Message>}

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: '#b8bcc8', fontSize: 12, display: 'block', marginBottom: 3 }}>Ngưỡng chung (ngày)</label>
            <input type='number' min='1' value={globalDays} onChange={(e) => setGlobalDays(e.target.value)} style={inputStyle} />
          </div>
          <button type='button' onClick={saveGlobal} style={{ background: '#33FFCC', border: 'none', borderRadius: 8, padding: '7px 18px', color: '#0f0f23', fontWeight: 700 }}>Lưu</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ border: '1px solid #ffd166', color: '#ffd166', borderRadius: 14, padding: '3px 12px', fontSize: 12 }}>
              Vượt ngưỡng: {data.summary.overCount}/{data.summary.totalCount} sản phẩm
            </span>
            <span style={{ border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: 14, padding: '3px 12px', fontSize: 12 }}>
              {data.summary.overStock} máy đang tồn quá ngưỡng
            </span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <ListFilterBar
          fields={FILTER_FIELDS}
          values={filters}
          defaults={DEFAULT_FILTERS}
          onApply={applyFilters}
          pairs={[['minDays', 'maxDays']]}
        />

        {loading ? <Loader /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f0f23', color: '#33FFCC' }}>
                  {COLUMNS.map((c) => {
                    const active = c.sortKey && sortConfig.key === c.sortKey
                    const arrow = active ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : c.sortKey ? ' ⇅' : ''
                    return (
                      <th key={c.label} style={{ ...th, cursor: c.sortKey ? 'pointer' : 'default', color: active ? '#ffd166' : undefined }}
                        onClick={c.sortKey ? () => handleSort(c.sortKey) : undefined}>
                        {c.label}<span style={{ opacity: active ? 1 : 0.4, fontSize: 11 }}>{arrow}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#8a8fa3' }}>Không có sản phẩm phù hợp</td></tr>
                )}
                {data.items.map((r) => {
                  const draft = drafts[r.productId]
                  return (
                    <tr key={r.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.stock}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }} title={r.basedOn === 'created' ? 'Chưa đủ phiếu nhập, tính từ ngày tạo sản phẩm' : 'Theo phiếu nhập'}>
                        {r.oldestDate ? new Date(r.oldestDate).toLocaleDateString('vi-VN') : '—'}
                        {r.basedOn === 'created' && <span style={{ color: '#8a8fa3' }}> (ngày tạo)</span>}
                        {r.oldestLot && <div style={{ color: '#8a8fa3', fontSize: 11 }}>{r.oldestLot}</div>}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: r.over ? '#ff6b6b' : '#e0e0e0' }}>{r.ageDays ?? '—'}</td>
                      <td style={td}>{r.daysSinceSale === null ? 'Chưa bán' : `${r.daysSinceSale} ngày trước`}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <input type='number' min='0' value={draft ?? (r.customThreshold || '')} placeholder={String(r.threshold)}
                          onChange={(e) => setDrafts({ ...drafts, [r.productId]: e.target.value })}
                          style={{ ...inputStyle, width: 70 }} title='Để trống hoặc 0 là dùng ngưỡng chung' />
                        {draft !== undefined && (
                          <button type='button' onClick={() => saveProduct({ ...r, productId: r.productId })}
                            style={{ marginLeft: 6, background: 'none', border: 'none', color: '#33FFCC', fontWeight: 700 }}>Lưu</button>
                        )}
                      </td>
                      <td style={td}>{r.over ? `+${r.overBy} ngày` : '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <span style={{ color: r.over ? '#ff6b6b' : '#4cdb80', fontWeight: 700 }}>{r.over ? 'Tồn quá lâu' : 'Trong ngưỡng'}</span>
                        {r.over && <Link to={`/admin/forecast`} style={{ marginLeft: 10, color: '#ffd166' }}>Xem dự báo</Link>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Paginate pages={data.pages} page={page} onPageChange={setPage} />
      </div>
    </>
  )
}

export default AgingStockScreen
