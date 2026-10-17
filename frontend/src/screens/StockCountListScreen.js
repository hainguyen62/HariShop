import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { QRCodeSVG } from 'qrcode.react'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import ListFilterBar from '../components/ListFilterBar'
import { useListControls } from '../utils/listControls'
import { fetchImportProducts } from '../actions/importActions'
import { fetchStockCounts } from '../actions/stockCountActions'

const cardStyle = {
  background: '#1a1a2e',
  border: '1px solid rgba(51,255,204,0.15)',
  borderRadius: 16,
  padding: 20,
  marginBottom: 24,
}
const th = { padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap', userSelect: 'none' }
const td = { padding: '10px 8px' }
const PAGE_SIZE = 10

const PRODUCT_DEFAULTS = { keyword: '', brand: '', stockStatus: '' }
const HISTORY_DEFAULTS = { keyword: '', result: '', adjusted: '', startDate: '', endDate: '' }

const HISTORY_FIELDS = [
  { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên sản phẩm' },
  {
    key: 'result', label: 'Kết quả', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, { value: 'match', label: 'Khớp' }, { value: 'diff', label: 'Có chênh lệch' }],
  },
  {
    key: 'adjusted', label: 'Chỉnh tồn kho', type: 'select', advanced: true,
    options: [{ value: '', label: 'Tất cả' }, { value: 'yes', label: 'Đã chỉnh' }, { value: 'no', label: 'Chỉ ghi nhận' }],
  },
  { key: 'startDate', label: 'Kiểm từ ngày', type: 'date', advanced: true },
  { key: 'endDate', label: 'Kiểm đến ngày', type: 'date', advanced: true },
]

const qrUrl = (id) => `${window.location.origin}/admin/stock-check/${id}`

const SortTh = ({ label, sortKey, sort, onSort }) => {
  const active = sort.key === sortKey
  const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'
  return (
    <th style={{ ...th, cursor: 'pointer', color: active ? '#ffd166' : undefined }} onClick={() => onSort(sortKey)} title={`Sắp xếp theo ${label}`}>
      {label}<span style={{ opacity: active ? 1 : 0.4, fontSize: 11 }}>{arrow}</span>
    </th>
  )
}

// section: 'all' hiện cả hai phần, 'products' chỉ phần đếm tay theo sản phẩm, 'history' chỉ lịch sử
const StockCountListScreen = ({ section = 'all' }) => {
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token

  // ── Phần 1: sản phẩm và tem QR (lọc và phân trang phía trình duyệt) ──
  const [products, setProducts] = useState([])
  const [prodLoading, setProdLoading] = useState(true)
  const [prodError, setProdError] = useState('')
  const [prodFilters, setProdFilters] = useState(PRODUCT_DEFAULTS)
  const [prodPage, setProdPage] = useState(1)
  const [prodSort, setProdSort] = useState({ key: 'name', dir: 'asc' })
  const [selected, setSelected] = useState({})
  const [printList, setPrintList] = useState(null)

  useEffect(() => {
    fetchImportProducts(token)
      .then(setProducts)
      .catch((e) => setProdError(e.message))
      .finally(() => setProdLoading(false))
  }, [token])

  const brandOptions = useMemo(
    () => [{ value: '', label: 'Tất cả' }, ...[...new Set(products.map((p) => p.brand).filter(Boolean))].sort().map((b) => ({ value: b, label: b }))],
    [products]
  )

  const productFields = [
    { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên sản phẩm' },
    { key: 'brand', label: 'Hãng', type: 'select', advanced: true, options: brandOptions },
    {
      key: 'stockStatus', label: 'Tình trạng kho', type: 'select', advanced: true,
      options: [{ value: '', label: 'Tất cả' }, { value: 'out', label: 'Hết hàng' }, { value: 'low', label: 'Sắp hết (1 đến 5)' }, { value: 'in', label: 'Còn nhiều (trên 5)' }],
    },
  ]

  const filteredProducts = useMemo(() => {
    const kw = prodFilters.keyword.trim().toLowerCase()
    const list = products.filter((p) => {
      if (kw && !p.name.toLowerCase().includes(kw) && !(p.productCode || '').toLowerCase().includes(kw)) return false
      if (prodFilters.brand && p.brand !== prodFilters.brand) return false
      const s = p.countInStock || 0
      if (prodFilters.stockStatus === 'out' && s !== 0) return false
      if (prodFilters.stockStatus === 'low' && !(s >= 1 && s <= 5)) return false
      if (prodFilters.stockStatus === 'in' && s <= 5) return false
      return true
    })
    const mul = prodSort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const x = a[prodSort.key]
      const y = b[prodSort.key]
      return (typeof x === 'number' ? x - y : String(x || '').localeCompare(String(y || ''), 'vi')) * mul
    })
  }, [products, prodFilters, prodSort])

  const prodPages = Math.max(Math.ceil(filteredProducts.length / PAGE_SIZE), 1)
  const pageRows = filteredProducts.slice((prodPage - 1) * PAGE_SIZE, prodPage * PAGE_SIZE)
  const selectedIds = Object.keys(selected).filter((id) => selected[id])

  const sortProducts = (key) => {
    setProdSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
    setProdPage(1)
  }

  const togglePage = (checked) => {
    const next = { ...selected }
    pageRows.forEach((p) => { next[p._id] = checked })
    setSelected(next)
  }

  const printLabels = (list) => {
    if (list.length === 0) return
    setPrintList(list)
    setTimeout(() => window.print(), 300)
  }

  // ── Phần 2: lịch sử kiểm kê ──
  const { filters, applyFilters, sortConfig, handleSort, page, setPage, params, paramsKey } = useListControls(HISTORY_DEFAULTS)
  const [history, setHistory] = useState({ counts: [], pages: 1, total: 0 })
  const [histLoading, setHistLoading] = useState(true)
  const [histError, setHistError] = useState('')

  const loadHistory = useCallback(async () => {
    setHistLoading(true)
    setHistError('')
    try {
      setHistory(await fetchStockCounts(token, params))
    } catch (e) {
      setHistError(e.message)
    } finally {
      setHistLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, paramsKey])

  useEffect(() => { loadHistory() }, [loadHistory])

  const histCols = [
    { label: 'Ngày kiểm', sortKey: 'countedAt' },
    { label: 'Sản phẩm', sortKey: 'productName' },
    { label: 'Chi tiết theo màu' },
    { label: 'Chênh lệch', sortKey: 'totalDiff' },
    { label: 'Tồn kho' },
    { label: 'Người kiểm' },
    { label: 'Ghi chú' },
  ]

  return (
    <>
      <Meta title='Kiểm kê kho' />
      <style>{`
        @media screen { .qr-print-area { display: none; } }
        @media print {
          body * { visibility: hidden; }
          .qr-print-area, .qr-print-area * { visibility: visible; }
          .qr-print-area { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; padding: 8mm; }
          .qr-label { border: 1px dashed #666; padding: 4mm; text-align: center; color: #000; background: #fff; page-break-inside: avoid; }
          .qr-label div { font-size: 11pt; font-weight: 700; margin-top: 2mm; word-break: break-word; }
        }
      `}</style>

      {section === 'all' && (
        <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 20 }}>
          <i className='fas fa-clipboard-check me-2' style={{ color: '#33FFCC' }}></i>Kiểm kê kho
        </h2>
      )}

      {section !== 'history' && (
      <div style={cardStyle}>
        <h5 style={{ color: '#33FFCC', fontWeight: 700, marginBottom: 6 }}>Tem QR sản phẩm</h5>
        <p style={{ color: '#b8bcc8', fontSize: 13, marginBottom: 14 }}>
          Dán tem lên kệ hoặc hộp hàng. Quét QR bằng điện thoại (đã đăng nhập admin) sẽ mở màn nhập số đếm của sản phẩm đó.
        </p>

        <ListFilterBar
          fields={productFields}
          values={prodFilters}
          defaults={PRODUCT_DEFAULTS}
          onApply={(v) => { setProdFilters(v); setProdPage(1) }}
          extra={
            <>
              <button type='button' onClick={() => printLabels(products.filter((p) => selected[p._id]))} disabled={selectedIds.length === 0}
                style={{ background: 'transparent', border: '1px solid #ffd166', borderRadius: 8, padding: '6px 14px', color: '#ffd166', fontWeight: 700, fontSize: 12, opacity: selectedIds.length === 0 ? 0.5 : 1 }}>
                <i className='fas fa-print me-2'></i>In tem đã chọn ({selectedIds.length})
              </button>
              <button type='button' onClick={() => printLabels(filteredProducts)} disabled={filteredProducts.length === 0}
                style={{ background: 'transparent', border: '1px solid #ffd166', borderRadius: 8, padding: '6px 14px', color: '#ffd166', fontWeight: 700, fontSize: 12 }}>
                <i className='fas fa-print me-2'></i>In tất cả kết quả lọc ({filteredProducts.length})
              </button>
            </>
          }
        />

        {prodError && <Message variant='danger'>{prodError}</Message>}
        {prodLoading ? <Loader /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f0f23', color: '#33FFCC' }}>
                  <th style={th}><input type='checkbox' onChange={(e) => togglePage(e.target.checked)} checked={pageRows.length > 0 && pageRows.every((p) => selected[p._id])} /></th>
                  <th style={th}>QR</th>
                  <SortTh label='Mã SP' sortKey='productCode' sort={prodSort} onSort={sortProducts} />
                  <SortTh label='Sản phẩm' sortKey='name' sort={prodSort} onSort={sortProducts} />
                  <SortTh label='Hãng' sortKey='brand' sort={prodSort} onSort={sortProducts} />
                  <SortTh label='Tồn hệ thống' sortKey='countInStock' sort={prodSort} onSort={sortProducts} />
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#8a8fa3' }}>Không có sản phẩm phù hợp</td></tr>
                )}
                {pageRows.map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={td}><input type='checkbox' checked={Boolean(selected[p._id])} onChange={(e) => setSelected({ ...selected, [p._id]: e.target.checked })} /></td>
                    <td style={td}><div style={{ background: '#fff', padding: 3, display: 'inline-block', borderRadius: 4 }}><QRCodeSVG value={qrUrl(p._id)} size={44} /></div></td>
                    <td style={td}>{p.productCode || '—'}</td>
                    <td style={td}>{p.name}</td>
                    <td style={td}>{p.brand}</td>
                    <td style={td}>{p.countInStock}</td>
                    <td style={td}><Link to={`/admin/stock-check/${p._id}`} style={{ color: '#33FFCC' }}>Kiểm kê</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginate pages={prodPages} page={prodPage} onPageChange={setProdPage} />
      </div>
      )}

      {section !== 'products' && (
      <div style={cardStyle}>
        <h5 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 14 }}>Lịch sử kiểm kê</h5>
        <ListFilterBar
          fields={HISTORY_FIELDS}
          values={filters}
          defaults={HISTORY_DEFAULTS}
          onApply={applyFilters}
          pairs={[['startDate', 'endDate']]}
          quickDates
        />
        {histError && <Message variant='danger'>{histError}</Message>}
        {histLoading ? <Loader /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f0f23', color: '#33FFCC' }}>
                  {histCols.map((c) => {
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
                {history.counts.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#8a8fa3' }}>Chưa có phiếu kiểm kê phù hợp</td></tr>
                )}
                {history.counts.map((r) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(r.countedAt).toLocaleString('vi-VN')}</td>
                    <td style={td}>{r.productName}</td>
                    <td style={td}>
                      {r.lines.map((l) => (
                        <div key={l.color || 'all'} style={{ whiteSpace: 'nowrap' }}>
                          {l.color || 'Tất cả'}: {l.systemQty} → <strong>{l.countedQty}</strong>
                        </div>
                      ))}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: r.totalDiff === 0 ? '#4cdb80' : '#ff6b6b' }}>{r.totalDiff > 0 ? `+${r.totalDiff}` : r.totalDiff}</td>
                    <td style={td}>{r.adjusted ? 'Đã chỉnh' : 'Giữ nguyên'}</td>
                    <td style={td}>{r.countedBy?.name || '—'}</td>
                    <td style={td}>{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginate pages={history.pages} page={page} onPageChange={setPage} />
      </div>
      )}

      {printList && (
        <div className='qr-print-area'>
          {printList.map((p) => (
            <div className='qr-label' key={p._id}>
              <QRCodeSVG value={qrUrl(p._id)} size={140} />
              <div>{p.productCode}</div>
              <div>{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default StockCountListScreen
