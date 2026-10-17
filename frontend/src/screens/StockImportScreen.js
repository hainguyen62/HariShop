import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Meta from '../components/Meta'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import ListFilterBar from '../components/ListFilterBar'
import { useListControls } from '../utils/listControls'
import {
  fetchImportProducts, fetchLastImportCost, createImport,
  fetchImports, deleteImport, exportImportsExcel,
} from '../actions/importActions'

const cardStyle = {
  background: '#1a1a2e',
  border: '1px solid rgba(51,255,204,0.15)',
  borderRadius: 16,
  padding: 20,
}

const inputStyle = {
  width: '100%',
  background: '#0f0f23',
  color: '#eef0f7',
  border: '1px solid rgba(51,255,204,0.35)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 14,
}

const labelStyle = { color: '#b8bcc8', fontSize: 12, marginBottom: 4, display: 'block' }
const money = (n) => `${(Number(n) || 0).toLocaleString('vi-VN')}đ`
const todayStr = () => new Date().toISOString().slice(0, 10)
const monthStartStr = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }

const DEFAULT_FILTERS = {
  keyword: '', startDate: monthStartStr(), endDate: todayStr(),
  color: '', supplier: '', minCost: '', maxCost: '', minQty: '', maxQty: '',
}

const FILTER_FIELDS = [
  { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên sản phẩm, mã lô hoặc nhà cung cấp' },
  { key: 'startDate', label: 'Từ ngày', type: 'date' },
  { key: 'endDate', label: 'Đến ngày', type: 'date' },
  { key: 'color', label: 'Màu sắc', type: 'text', advanced: true, placeholder: 'VD: Đen' },
  { key: 'supplier', label: 'Nhà cung cấp', type: 'text', advanced: true },
  { key: 'minCost', label: 'Giá nhập từ (đ)', type: 'number', advanced: true },
  { key: 'maxCost', label: 'Giá nhập đến (đ)', type: 'number', advanced: true },
  { key: 'minQty', label: 'Số lượng từ', type: 'number', advanced: true },
  { key: 'maxQty', label: 'Số lượng đến', type: 'number', advanced: true },
]

const COLUMNS = [
  { label: 'Mã lô', sortKey: 'lotCode' },
  { label: 'Ngày nhập', sortKey: 'importedAt' },
  { label: 'Sản phẩm', sortKey: 'productName' },
  { label: 'Màu', sortKey: 'color' },
  { label: 'SL', sortKey: 'quantity' },
  { label: 'Giá nhập', sortKey: 'unitCost' },
  { label: 'Thành tiền', sortKey: 'totalCost' },
  { label: 'Tồn' },
  { label: 'Nhà cung cấp', sortKey: 'supplier' },
  { label: 'Ghi chú' },
  { label: '' },
]

const emptyForm = { productId: '', color: '', quantity: '', unitCost: '', supplier: '', note: '', lotCode: '', importedAt: todayStr() }

const StockImportScreen = () => {
  const { userInfo } = useSelector((state) => state.userLogin)
  const token = userInfo?.token

  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [lastLot, setLastLot] = useState('')
  const [costHint, setCostHint] = useState(null)

  const { filters, applyFilters, sortConfig, handleSort, page, setPage, params, paramsKey } = useListControls(DEFAULT_FILTERS)
  const [list, setList] = useState({ imports: [], pages: 1, summary: { totalCost: 0, totalQty: 0, count: 0 } })
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [exporting, setExporting] = useState(false)

  const product = useMemo(() => products.find((p) => p._id === form.productId), [products, form.productId])
  const hasColors = Boolean(product?.colors?.length)
  const currentStock = useMemo(() => {
    if (!product) return null
    if (!hasColors) return product.countInStock
    return product.colors.find((c) => c.name === form.color)?.countInStock ?? null
  }, [product, hasColors, form.color])

  const qty = Number(form.quantity)
  const cost = Number(form.unitCost)
  const previewTotal = Number.isFinite(qty) && Number.isFinite(cost) && qty > 0 && cost >= 0 ? Math.round(qty * cost) : 0

  const loadProducts = useCallback(async () => {
    try { setProducts(await fetchImportProducts(token)) } catch (e) { setFormError(e.message) }
  }, [token])

  const loadList = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const { pageNumber, ...rest } = params
      setList(await fetchImports(token, { ...rest, page: pageNumber }))
    } catch (e) {
      setListError(e.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, paramsKey])

  useEffect(() => { loadProducts() }, [loadProducts])

  // Mở từ trang dự báo: /admin/imports?productId=...&qty=...
  useEffect(() => {
    if (products.length === 0) return
    const q = new URLSearchParams(window.location.search)
    const pid = q.get('productId')
    if (pid && products.some((p) => p._id === pid)) {
      setForm((f) => (f.productId ? f : { ...f, productId: pid, quantity: q.get('qty') || f.quantity }))
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [products])

  useEffect(() => {
    const onFocus = () => loadProducts()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadProducts])
  useEffect(() => { loadList() }, [loadList])

  useEffect(() => {
    if (!loading && list.imports.length === 0 && page > 1) setPage(page - 1)
  }, [loading, list.imports.length, page, setPage])

  useEffect(() => {
    if (!form.productId || (hasColors && !form.color)) { setCostHint(null); return }
    let cancelled = false
    fetchLastImportCost(token, form.productId, hasColors ? form.color : '')
      .then((d) => { if (!cancelled) setCostHint(d) })
      .catch(() => { if (!cancelled) setCostHint(null) })
    return () => { cancelled = true }
  }, [token, form.productId, form.color, hasColors])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const onProductChange = (id) => {
    setForm((f) => ({ ...f, productId: id, color: '' }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    setNotice('')
    if (!form.productId) return setFormError('Vui lòng chọn sản phẩm')
    if (hasColors && !form.color) return setFormError('Vui lòng chọn màu sắc')
    if (!Number.isInteger(qty) || qty < 1) return setFormError('Số lượng phải là số nguyên lớn hơn 0')
    if (!Number.isFinite(cost) || cost < 0 || form.unitCost === '') return setFormError('Vui lòng nhập giá nhập hợp lệ')

    setSaving(true)
    try {
      const rec = await createImport(token, { ...form, quantity: qty, unitCost: cost })
      setNotice(`Đã nhập ${rec.quantity} × ${rec.productName}${rec.color ? ` (${rec.color})` : ''}, mã lô ${rec.lotCode}: tồn kho ${rec.stockBefore} → ${rec.stockAfter}`)
      setLastLot(rec.unitsGenerated > 0 ? rec.lotCode : '')
      setForm({ ...emptyForm, importedAt: form.importedAt, supplier: form.supplier, lotCode: rec.lotCode })
      if (page !== 1) setPage(1)
      await Promise.all([loadProducts(), loadList()])
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!window.confirm(`Huỷ phiếu nhập ${row.quantity} × ${row.productName}${row.color ? ` (${row.color})` : ''}? Tồn kho sẽ bị trừ lại ${row.quantity}.`)) return
    setNotice('')
    try {
      await deleteImport(token, row._id)
      setNotice('Đã huỷ phiếu nhập và trừ lại tồn kho')
      await Promise.all([loadProducts(), loadList()])
    } catch (err) {
      setListError(err.message)
    }
  }

  const exportExcel = async () => {
    if (!filters.startDate || !filters.endDate) return setListError('Chọn khoảng ngày để xuất báo cáo')
    setExporting(true)
    setListError('')
    try {
      await exportImportsExcel(token, filters)
    } catch (err) {
      setListError(err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Meta title='Nhập hàng' />
      <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 20 }}>
        <i className='fas fa-dolly me-2' style={{ color: '#33FFCC' }}></i>Nhập hàng
      </h2>

      {notice && (
        <Message variant='success'>
          {notice}
          {lastLot && <> · <Link to={`/admin/stock-count?tab=labels&lot=${lastLot}`}>In tem cho lô này</Link></>}
        </Message>
      )}

      <form onSubmit={submit} style={{ ...cardStyle, marginBottom: 24 }}>
        <h5 style={{ color: '#33FFCC', fontWeight: 700, marginBottom: 16 }}>Tạo phiếu nhập</h5>
        {formError && <Message variant='danger'>{formError}</Message>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Sản phẩm</label>
            <select value={form.productId} onChange={(e) => onProductChange(e.target.value)} style={inputStyle}>
              <option value=''>-- Chọn sản phẩm --</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name} (tồn {p.countInStock})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Màu sắc</label>
            <select value={form.color} onChange={(e) => setField('color', e.target.value)} style={inputStyle} disabled={!hasColors}>
              <option value=''>{hasColors ? '-- Chọn màu --' : 'Không có biến thể màu'}</option>
              {(product?.colors || []).map((c) => (
                <option key={c.name} value={c.name}>{c.name} (tồn {c.countInStock})</option>
              ))}
            </select>
            {product && (
              <a href={`/admin/product/${product._id}/edit`} target='_blank' rel='noopener noreferrer' style={{ display: 'inline-block', marginTop: 4, color: '#33FFCC', fontSize: 12 }}>
                + Thêm màu mới cho sản phẩm này
              </a>
            )}
          </div>

          <div>
            <label style={labelStyle}>Số lượng nhập</label>
            <input type='number' min='1' step='1' value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} style={inputStyle} placeholder='VD: 10' />
          </div>

          <div>
            <label style={labelStyle}>Giá nhập (đồng / máy)</label>
            <input type='number' min='0' step='1000' value={form.unitCost} onChange={(e) => setField('unitCost', e.target.value)} style={inputStyle} placeholder='Giá theo thị trường hiện tại' />
            {costHint && (
              <button type='button' onClick={() => setField('unitCost', String(costHint.unitCost))}
                style={{ background: 'none', border: 'none', color: '#ffd166', fontSize: 12, padding: 0, marginTop: 4, cursor: 'pointer' }}>
                Lần nhập gần nhất: {money(costHint.unitCost)} ({new Date(costHint.importedAt).toLocaleDateString('vi-VN')}), bấm để dùng lại
              </button>
            )}
          </div>

          <div>
            <label style={labelStyle}>Ngày nhập</label>
            <input type='date' value={form.importedAt} onChange={(e) => setField('importedAt', e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Nhà cung cấp</label>
            <input type='text' value={form.supplier} onChange={(e) => setField('supplier', e.target.value)} style={inputStyle} placeholder='Không bắt buộc' />
          </div>

          <div>
            <label style={labelStyle}>
              Mã lô
              {form.lotCode && <a href='#!' onClick={(e) => { e.preventDefault(); setField('lotCode', '') }} style={{ marginLeft: 8, fontSize: 12 }}>Tạo lô mới</a>}
            </label>
            <input type='text' value={form.lotCode} onChange={(e) => setField('lotCode', e.target.value.toUpperCase())} style={inputStyle} placeholder='Để trống để tạo lô mới' />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Ghi chú</label>
            <input type='text' value={form.note} onChange={(e) => setField('note', e.target.value)} style={inputStyle} placeholder='VD: giá thị trường tăng, đợt nhập lẻ...' />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginTop: 18 }}>
          <div style={{ color: '#b8bcc8', fontSize: 14 }}>
            {currentStock !== null && qty > 0 && (
              <div>Tồn kho: <strong style={{ color: '#eef0f7' }}>{currentStock}</strong> → <strong style={{ color: '#4cdb80' }}>{currentStock + (Number.isInteger(qty) ? qty : 0)}</strong></div>
            )}
            <div>Thành tiền: <strong style={{ color: '#ffd166', fontSize: 18 }}>{money(previewTotal)}</strong></div>
          </div>
          <button type='submit' disabled={saving}
            style={{ background: '#33FFCC', border: 'none', borderRadius: 8, padding: '10px 26px', color: '#0f0f23', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            <i className='fas fa-plus-circle me-2'></i>{saving ? 'Đang lưu...' : 'Nhập hàng'}
          </button>
        </div>
      </form>

      <div style={cardStyle}>
        <h5 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 14 }}>Lịch sử nhập hàng</h5>
        <ListFilterBar
          fields={FILTER_FIELDS}
          values={filters}
          defaults={DEFAULT_FILTERS}
          onApply={applyFilters}
          pairs={[['startDate', 'endDate'], ['minCost', 'maxCost'], ['minQty', 'maxQty']]}
          extra={
            <button type='button' onClick={exportExcel} disabled={exporting}
              style={{ background: 'transparent', border: '1px solid #4cdb80', borderRadius: 8, padding: '6px 14px', color: '#4cdb80', fontWeight: 700, fontSize: 12, cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.6 : 1 }}>
              <i className='fas fa-file-excel me-2'></i>{exporting ? 'Đang xuất...' : 'Xuất báo cáo nhập hàng'}
            </button>
          }
        />

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 14, color: '#b8bcc8', fontSize: 14 }}>
          <span>Số phiếu: <strong style={{ color: '#eef0f7' }}>{list.summary.count}</strong></span>
          <span>Tổng số lượng: <strong style={{ color: '#eef0f7' }}>{list.summary.totalQty}</strong></span>
          <span>Tổng chi phí: <strong style={{ color: '#ffd166' }}>{money(list.summary.totalCost)}</strong></span>
        </div>

        {listError && <Message variant='danger'>{listError}</Message>}
        {loading ? <Loader /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f0f23', color: '#33FFCC' }}>
                  {COLUMNS.map((c) => {
                    const active = c.sortKey && sortConfig.key === c.sortKey
                    const arrow = active ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : c.sortKey ? ' ⇅' : ''
                    return (
                      <th
                        key={c.label || 'actions'}
                        onClick={c.sortKey ? () => handleSort(c.sortKey) : undefined}
                        title={c.sortKey ? `Sắp xếp theo ${c.label}` : undefined}
                        style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap', cursor: c.sortKey ? 'pointer' : 'default', userSelect: 'none', color: active ? '#ffd166' : undefined }}
                      >
                        {c.label}<span style={{ opacity: active ? 1 : 0.4, fontSize: 11 }}>{arrow}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {list.imports.length === 0 && (
                  <tr><td colSpan={11} style={{ padding: 20, textAlign: 'center', color: '#8a8fa3' }}>Chưa có phiếu nhập trong khoảng này</td></tr>
                )}
                {list.imports.map((r) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: '#ffd166' }}>{r.lotCode || '—'}</td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{new Date(r.importedAt).toLocaleDateString('vi-VN')}</td>
                    <td style={{ padding: '10px 8px' }}>{r.productName}</td>
                    <td style={{ padding: '10px 8px' }}>{r.color || '—'}</td>
                    <td style={{ padding: '10px 8px' }}>{r.quantity}</td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{money(r.unitCost)}</td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: '#ffd166' }}>{money(r.totalCost)}</td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{r.stockBefore} → {r.stockAfter}</td>
                    <td style={{ padding: '10px 8px' }}>{r.supplier || '—'}</td>
                    <td style={{ padding: '10px 8px' }}>{r.note || '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <i className='fas fa-trash text-danger' title='Huỷ phiếu nhập' style={{ cursor: 'pointer' }} onClick={() => remove(r)}></i>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Paginate pages={list.pages} page={page} onPageChange={setPage} />
      </div>
    </>
  )
}

export default StockImportScreen
