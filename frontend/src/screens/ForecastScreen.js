import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from 'react-bootstrap'
import { useSelector } from 'react-redux'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import ListFilterBar from '../components/ListFilterBar'
import { fetchForecastOverview, fetchProductForecast, fetchForecastAdvice, updateInventorySettings } from '../actions/forecastActions'

const cardStyle = { background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)', borderRadius: 16, padding: 20, marginBottom: 24 }
const inputStyle = { width: 90, background: '#0f0f23', color: '#eef0f7', border: '1px solid rgba(51,255,204,0.35)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }
const th = { padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap', userSelect: 'none' }
const td = { padding: '10px 8px' }
const PAGE_SIZE = 10
const money = (n) => `${(Number(n) || 0).toLocaleString('vi-VN')}đ`

const STATUS = {
  out: { label: 'Hết hàng', color: '#ff6b6b' },
  reorder: { label: 'Cần nhập', color: '#ffd166' },
  ok: { label: 'Ổn định', color: '#4cdb80' },
  overstock: { label: 'Tồn nhiều', color: '#5eb3f6' },
  no_demand: { label: 'Chưa có nhu cầu', color: '#8a8fa3' },
}
const TREND = {
  up: { label: 'Đang tăng', color: '#ff6b6b', icon: 'fa-arrow-up' },
  down: { label: 'Đang giảm', color: '#4cdb80', icon: 'fa-arrow-down' },
  flat: { label: 'Ổn định', color: '#b8bcc8', icon: 'fa-minus' },
  unknown: { label: 'Chưa đủ dữ liệu', color: '#8a8fa3', icon: 'fa-question' },
}

const DEFAULT_FILTERS = { keyword: '', status: '', trend: '', minSuggest: '', maxSuggest: '' }
const FILTER_FIELDS = [
  { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên sản phẩm' },
  {
    key: 'status', label: 'Trạng thái', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, ...Object.entries(STATUS).map(([value, v]) => ({ value, label: v.label }))],
  },
  {
    key: 'trend', label: 'Xu hướng giá nhập', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, ...Object.entries(TREND).map(([value, v]) => ({ value, label: v.label }))],
  },
  { key: 'minSuggest', label: 'Gợi ý nhập từ', type: 'number', advanced: true },
  { key: 'maxSuggest', label: 'Gợi ý nhập đến', type: 'number', advanced: true },
]

const COLUMNS = [
  { label: 'Sản phẩm', key: 'name' },
  { label: 'Tồn', key: 'stock' },
  { label: 'Dự báo/tuần', key: 'weeklyForecast' },
  { label: 'Đủ bán (ngày)', key: 'daysOfCover' },
  { label: 'Điểm đặt hàng', key: 'reorderPoint' },
  { label: 'Gợi ý nhập', key: 'suggestedQty' },
  { label: 'Giá nhập' },
  { label: 'Trạng thái' },
  { label: '' },
]

// Biểu đồ đường đơn giản: giá trị thực nét liền, dự báo nét đứt
const LineChart = ({ values, forecast = [], height = 170 }) => {
  const width = 560
  const pad = 28
  const all = [...values, ...forecast]
  const max = Math.max(...all, 1)
  const n = all.length
  const x = (i) => pad + (n <= 1 ? 0 : (i * (width - pad * 2)) / (n - 1))
  const y = (v) => height - pad - (v / max) * (height - pad * 2)
  const line = (arr, offset) => arr.map((v, i) => `${x(i + offset)},${y(v)}`).join(' ')
  const bridge = forecast.length && values.length ? [values[values.length - 1], ...forecast] : forecast
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke='rgba(255,255,255,0.2)' />
      <text x={4} y={y(max) + 4} fill='#8a8fa3' fontSize='10'>{Math.round(max).toLocaleString('vi-VN')}</text>
      <text x={4} y={height - pad + 4} fill='#8a8fa3' fontSize='10'>0</text>
      {values.length > 0 && <polyline points={line(values, 0)} fill='none' stroke='#33FFCC' strokeWidth='2' />}
      {forecast.length > 0 && <polyline points={line(bridge, values.length - 1)} fill='none' stroke='#ffd166' strokeWidth='2' strokeDasharray='5 4' />}
      {values.map((v, i) => <circle key={`v${i}`} cx={x(i)} cy={y(v)} r='2.5' fill='#33FFCC' />)}
      {forecast.map((v, i) => <circle key={`f${i}`} cx={x(values.length + i)} cy={y(v)} r='2.5' fill='#ffd166' />)}
    </svg>
  )
}

const ForecastScreen = () => {
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token

  const [params, setParams] = useState({ leadDays: '', coverDays: '' })
  const [data, setData] = useState({ rows: [], params: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState({ key: null, dir: 'desc' })
  const [page, setPage] = useState(1)

  const [advice, setAdvice] = useState(null)
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async (p) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchForecastOverview(token, p)
      setData(res)
      setParams({ leadDays: String(res.params.leadDays), coverDays: String(res.params.coverDays) })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load({}) }, [load])

  const counts = useMemo(() => {
    const c = {}
    data.rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [data.rows])

  const shown = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase()
    const min = filters.minSuggest === '' ? null : Number(filters.minSuggest)
    const max = filters.maxSuggest === '' ? null : Number(filters.maxSuggest)
    const list = data.rows.filter((r) => {
      if (kw && !r.name.toLowerCase().includes(kw)) return false
      if (filters.status && r.status !== filters.status) return false
      if (filters.trend && r.costTrend.direction !== filters.trend) return false
      if (min !== null && r.suggestedQty < min) return false
      if (max !== null && r.suggestedQty > max) return false
      return true
    })
    if (!sort.key) return list
    const mul = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const x = a[sort.key] ?? Infinity
      const y = b[sort.key] ?? Infinity
      return (typeof x === 'string' ? x.localeCompare(y, 'vi') : x - y) * mul
    })
  }, [data.rows, filters, sort])

  const pages = Math.max(Math.ceil(shown.length / PAGE_SIZE), 1)
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const onSort = (key) => {
    setSort((s) => (s.key !== key ? { key, dir: 'desc' } : s.dir === 'desc' ? { key, dir: 'asc' } : { key: null, dir: 'desc' }))
    setPage(1)
  }

  const recalc = (e) => {
    e.preventDefault()
    setAdvice(null)
    load({ leadDays: params.leadDays, coverDays: params.coverDays })
  }

  const saveDefaults = async () => {
    setError('')
    try {
      await updateInventorySettings(token, { leadTimeDays: Number(params.leadDays), coverDays: Number(params.coverDays) })
    } catch (e) {
      setError(e.message)
    }
  }

  const askAdvice = async () => {
    setAdviceLoading(true)
    setAdvice(null)
    try {
      setAdvice(await fetchForecastAdvice(token, { leadDays: params.leadDays, coverDays: params.coverDays }))
    } catch (e) {
      setError(e.message)
    } finally {
      setAdviceLoading(false)
    }
  }

  const openDetail = async (row) => {
    setDetail({ name: row.name })
    setDetailLoading(true)
    try {
      setDetail(await fetchProductForecast(token, row.productId, { leadDays: params.leadDays, coverDays: params.coverDays }))
    } catch (e) {
      setError(e.message)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <>
      <Meta title='Dự báo nhập hàng' />
      <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 6 }}>
        <i className='fas fa-chart-line me-2' style={{ color: '#33FFCC' }}></i>Dự báo và gợi ý nhập hàng
      </h2>
      <p style={{ color: '#b8bcc8', fontSize: 13, marginBottom: 20 }}>
        Dự báo từ lịch sử đơn hàng của shop bằng trung bình trượt, làm mịn mũ và Holt, mỗi sản phẩm tự chọn phương pháp có sai số backtest nhỏ nhất.
        Đơn bị huỷ hoặc hoàn không được tính.
      </p>

      {error && <Message variant='danger'>{error}</Message>}

      <div style={cardStyle}>
        <form onSubmit={recalc} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: '#b8bcc8', fontSize: 12, display: 'block', marginBottom: 3 }}>Thời gian chờ hàng (ngày)</label>
            <input type='number' min='1' max='90' value={params.leadDays} onChange={(e) => setParams({ ...params, leadDays: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#b8bcc8', fontSize: 12, display: 'block', marginBottom: 3 }}>Muốn đủ hàng thêm (ngày)</label>
            <input type='number' min='1' max='180' value={params.coverDays} onChange={(e) => setParams({ ...params, coverDays: e.target.value })} style={inputStyle} />
          </div>
          <button type='submit' style={{ background: '#33FFCC', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#0f0f23', fontWeight: 700 }}>Tính lại</button>
          <button type='button' onClick={saveDefaults}
            style={{ background: 'transparent', border: '1px solid rgba(51,255,204,0.4)', borderRadius: 8, padding: '8px 18px', color: '#33FFCC', fontWeight: 700 }}>
            Lưu làm mặc định
          </button>
          <button type='button' onClick={askAdvice} disabled={adviceLoading}
            style={{ background: 'transparent', border: '1px solid #ffd166', borderRadius: 8, padding: '8px 18px', color: '#ffd166', fontWeight: 700, opacity: adviceLoading ? 0.6 : 1 }}>
            <i className='fas fa-robot me-2'></i>{adviceLoading ? 'Đang phân tích...' : 'Nhận xét của AI'}
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {Object.entries(STATUS).map(([k, v]) => (
              <span key={k} style={{ border: `1px solid ${v.color}`, color: v.color, borderRadius: 14, padding: '3px 10px', fontSize: 12 }}>
                {v.label}: {counts[k] || 0}
              </span>
            ))}
          </div>
        </form>
        {advice && (
          <div style={{ marginTop: 16, padding: 14, background: '#0f0f23', borderRadius: 10, color: '#e0e0e0', fontSize: 14, whiteSpace: 'pre-line' }}>
            {advice.text}
            <div style={{ color: '#8a8fa3', fontSize: 11, marginTop: 8 }}>
              {advice.source === 'ai' ? 'AI diễn giải từ số liệu thống kê ở bảng dưới' : 'AI chưa phản hồi, nhận xét được dựng trực tiếp từ số liệu'}
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <ListFilterBar
          fields={FILTER_FIELDS}
          values={filters}
          defaults={DEFAULT_FILTERS}
          onApply={(v) => { setFilters(v); setPage(1) }}
          pairs={[['minSuggest', 'maxSuggest']]}
        />

        {loading ? <Loader /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f0f23', color: '#33FFCC' }}>
                  {COLUMNS.map((c) => {
                    const active = c.key && sort.key === c.key
                    const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : c.key ? ' ⇅' : ''
                    return (
                      <th key={c.label || 'act'} style={{ ...th, cursor: c.key ? 'pointer' : 'default', color: active ? '#ffd166' : undefined }}
                        onClick={c.key ? () => onSort(c.key) : undefined}>
                        {c.label}<span style={{ opacity: active ? 1 : 0.4, fontSize: 11 }}>{arrow}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#8a8fa3' }}>Không có sản phẩm phù hợp</td></tr>
                )}
                {pageRows.map((r) => {
                  const st = STATUS[r.status]
                  const tr = TREND[r.costTrend.direction]
                  return (
                    <tr key={r.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={td}>{r.name}</td>
                      <td style={td}>{r.stock}</td>
                      <td style={td} title={`${r.methodLabel}, độ tin cậy ${r.confidence}`}>{r.weeklyForecast}</td>
                      <td style={td}>{r.daysOfCover === null ? '—' : r.daysOfCover}</td>
                      <td style={td}>{r.reorderPoint}</td>
                      <td style={{ ...td, fontWeight: 700, color: r.suggestedQty > 0 ? '#ffd166' : '#8a8fa3' }}>{r.suggestedQty}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: tr.color }}>
                        <i className={`fas ${tr.icon} me-1`}></i>{tr.label}
                        {r.costTrend.changePerMonthPct !== null && ` (${r.costTrend.changePerMonthPct > 0 ? '+' : ''}${r.costTrend.changePerMonthPct}%/tháng)`}
                      </td>
                      <td style={{ ...td, color: st.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <button type='button' onClick={() => openDetail(r)} style={{ background: 'none', border: 'none', color: '#33FFCC', padding: 0, marginRight: 12 }}>Chi tiết</button>
                        <Link to={`/admin/imports?productId=${r.productId}${r.suggestedQty > 0 ? `&qty=${r.suggestedQty}` : ''}`} style={{ color: '#ffd166' }}>Nhập hàng</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Paginate pages={pages} page={page} onPageChange={setPage} />
      </div>

      <Modal show={Boolean(detail)} onHide={() => setDetail(null)} size='lg' centered>
        <Modal.Header closeButton style={{ background: '#1a1a2e', color: '#fff', borderColor: 'rgba(51,255,204,0.2)' }}>
          <Modal.Title style={{ fontSize: 18 }}>{detail?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#14142a', color: '#e0e0e0' }}>
          {detailLoading || !detail?.history ? <Loader /> : (
            <>
              <h6 style={{ color: '#33FFCC' }}>Số máy bán mỗi tuần ({detail.history.length} tuần gần nhất) và dự báo 4 tuần tới</h6>
              <LineChart values={detail.history.map((h) => h.qty)} forecast={detail.forecast} />
              <div style={{ fontSize: 12, color: '#8a8fa3', marginBottom: 14 }}>Nét liền là số bán thực tế, nét đứt là dự báo.</div>

              <h6 style={{ color: '#33FFCC' }}>So sánh phương pháp (sai số trung bình tuyệt đối, càng nhỏ càng tốt)</h6>
              <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
                <tbody>
                  {detail.candidates.map((c) => (
                    <tr key={c.id} style={{ color: c.id === detail.method ? '#ffd166' : undefined, fontWeight: c.id === detail.method ? 700 : 400 }}>
                      <td style={{ padding: '4px 0' }}>{c.label}{c.id === detail.method ? ' (được chọn)' : ''}</td>
                      <td style={{ textAlign: 'right' }}>{c.mae === null ? 'chưa đủ dữ liệu' : c.mae}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h6 style={{ color: '#33FFCC' }}>Giá nhập</h6>
              {detail.costPoints.length === 0 ? (
                <div style={{ color: '#8a8fa3', fontSize: 13 }}>Chưa có phiếu nhập cho sản phẩm này.</div>
              ) : (
                <>
                  <LineChart values={detail.costPoints.map((p) => p.price)} forecast={detail.costTrend.nextMonthEstimate ? [detail.costTrend.nextMonthEstimate] : []} />
                  <div style={{ fontSize: 13 }}>
                    Lần nhập gần nhất {money(detail.costTrend.lastPrice)}
                    {detail.costTrend.nextMonthEstimate !== null && <>, ước tính tháng tới khoảng {money(detail.costTrend.nextMonthEstimate)} (hồi quy tuyến tính trên {detail.costTrend.points} lần nhập, R² = {detail.costTrend.r2})</>}
                  </div>
                </>
              )}

              <h6 style={{ color: '#33FFCC', marginTop: 16 }}>Giá thị trường (nguồn ngoài)</h6>
              {detail.marketPoints.length === 0 ? (
                <div style={{ color: '#8a8fa3', fontSize: 13 }}>
                  Chưa có dữ liệu. Thêm file backend/data/market_prices.csv (cột product,date,price) để đưa giá thị trường vào.
                </div>
              ) : (
                <>
                  <LineChart values={detail.marketPoints.map((p) => p.price)} forecast={detail.marketTrend.nextMonthEstimate ? [detail.marketTrend.nextMonthEstimate] : []} />
                  <div style={{ fontSize: 13 }}>
                    Giá gần nhất {money(detail.marketTrend.lastPrice)}
                    {detail.marketTrend.changePerMonthPct !== null && <>, xu hướng {detail.marketTrend.changePerMonthPct > 0 ? '+' : ''}{detail.marketTrend.changePerMonthPct}%/tháng</>}
                  </div>
                </>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  )
}

export default ForecastScreen
