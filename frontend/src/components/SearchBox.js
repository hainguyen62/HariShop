import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Form, Button, Spinner } from 'react-bootstrap'
import { useSelector } from 'react-redux'
import axios from 'axios'
import Rating from './Rating'
import { findHighlightSegments } from '../utils/normalizeVietnamese'

const GUEST_HISTORY_KEY = 'searchHistory'
const MAX_HISTORY = 10
const DEBOUNCE_MS = 300

const formatPrice = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'

// ───────────────────────── localStorage cho khách chưa đăng nhập ─────────────────────────
const readGuestHistory = () => {
  try {
    const raw = localStorage.getItem(GUEST_HISTORY_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr)
      ? arr.map((item) => (typeof item === 'string' ? { keyword: item } : item))
      : []
  } catch {
    return []
  }
}
const writeGuestHistory = (arr) => {
  try {
    localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(arr.slice(0, MAX_HISTORY)))
  } catch {
    // localStorage không khả dụng (chế độ ẩn danh chặn...) — bỏ qua, không chặn UI
  }
}

// In đậm đoạn khớp với từ khóa, không phân biệt hoa/thường và dấu
const HighlightText = ({ text, query }) => {
  const seg = findHighlightSegments(text, query)
  if (!seg) return <>{text}</>
  return (
    <>
      {seg.before}
      <strong className='hs-search-highlight'>{seg.match}</strong>
      {seg.after}
    </>
  )
}

const STYLE = `
  .hs-search-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 44px;
    background: #12122a;
    border: 1px solid rgba(51,255,204,0.25);
    border-radius: 14px;
    box-shadow: 0 16px 40px rgba(0,0,0,0.45);
    max-height: 420px;
    overflow-y: auto;
    z-index: 1200;
    animation: hsSearchFadeIn 180ms ease-out;
    padding: 8px 0;
  }
  @keyframes hsSearchFadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .hs-search-group-label {
    padding: 8px 16px 4px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .hs-search-clear-all {
    color: #ff6b6b;
    cursor: pointer;
    font-size: 11px;
    text-transform: none;
  }
  .hs-search-clear-all:hover { text-decoration: underline; }
  .hs-search-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    cursor: pointer;
    color: #eef0f7;
    transition: background 120ms ease;
  }
  .hs-search-item:hover, .hs-search-item.active {
    background: rgba(51,255,204,0.12);
  }
  .hs-search-item i.hs-search-icon {
    width: 16px;
    text-align: center;
    color: #33FFCC;
    flex-shrink: 0;
  }
  .hs-search-item .hs-search-remove {
    margin-left: auto;
    color: rgba(255,255,255,0.35);
    padding: 2px 6px;
  }
  .hs-search-item .hs-search-remove:hover { color: #ff6b6b; }
  .hs-search-highlight { color: #33FFCC; font-weight: 700; }
  .hs-search-product-thumb {
    width: 40px; height: 40px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
    background: #1a1a35;
  }
  .hs-search-product-info { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
  .hs-search-product-name { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hs-search-product-meta { font-size: 12px; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 8px; }
  .hs-search-product-meta .rating span i { font-size: 10px; }
  .hs-search-empty-hint {
    padding: 20px 16px;
    text-align: center;
    color: rgba(255,255,255,0.55);
    font-size: 13.5px;
  }
  .hs-search-empty-hint ul { text-align: left; margin: 10px auto 0; display: inline-block; padding-left: 18px; font-size: 12.5px; color: rgba(255,255,255,0.4); }
  .hs-search-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 24px 0; color: rgba(255,255,255,0.6); font-size: 13px; }

  @media (max-width: 767px) {
    .hs-search-dropdown { right: 0; max-height: 60vh; }
    .hs-search-item { padding: 12px 16px; }
  }
`

const SearchBox = ({ history }) => {
  const [keyword, setKeyword] = useState('')
  const [aiMode, setAiMode] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState({ brands: [], categories: [], products: [], hasResults: true })
  const [searchHistory, setSearchHistoryState] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  const authHeader = userInfo?.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : null

  // ── Nạp lịch sử tìm kiếm: API nếu đã đăng nhập, localStorage nếu là khách ──
  const loadHistory = useCallback(async () => {
    if (authHeader) {
      try {
        const { data } = await axios.get('/api/users/search-history', authHeader)
        setSearchHistoryState(Array.isArray(data) ? data : [])
      } catch {
        setSearchHistoryState([])
      }
    } else {
      setSearchHistoryState(readGuestHistory())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.token])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const saveToHistory = async (term) => {
    const trimmed = term.trim()
    if (!trimmed) return
    if (authHeader) {
      try {
        const { data } = await axios.post('/api/users/search-history', { keyword: trimmed }, authHeader)
        setSearchHistoryState(Array.isArray(data) ? data : [])
      } catch {
        // không chặn luồng tìm kiếm nếu lưu lịch sử thất bại
      }
    } else {
      const current = readGuestHistory().filter(
        (h) => h.keyword.toLowerCase() !== trimmed.toLowerCase()
      )
      const next = [{ keyword: trimmed, searchedAt: new Date().toISOString() }, ...current].slice(0, MAX_HISTORY)
      writeGuestHistory(next)
      setSearchHistoryState(next)
    }
  }

  const deleteHistoryItem = async (term, e) => {
    e.stopPropagation()
    if (authHeader) {
      try {
        const { data } = await axios.delete(`/api/users/search-history/${encodeURIComponent(term)}`, authHeader)
        setSearchHistoryState(Array.isArray(data) ? data : [])
      } catch {
        // giữ nguyên danh sách hiện tại nếu xóa thất bại
      }
    } else {
      const next = readGuestHistory().filter((h) => h.keyword !== term)
      writeGuestHistory(next)
      setSearchHistoryState(next)
    }
  }

  const clearAllHistory = async (e) => {
    e.stopPropagation()
    if (authHeader) {
      try {
        await axios.delete('/api/users/search-history', authHeader)
      } catch {
        // vẫn xóa trên giao diện, lần load sau sẽ tự đồng bộ lại nếu server chưa xóa
      }
    } else {
      writeGuestHistory([])
    }
    setSearchHistoryState([])
  }

  // ── Gợi ý theo thời gian thực: debounce 300ms + hủy request cũ ──
  useEffect(() => {
    if (aiMode) return
    if (!keyword.trim()) {
      setSuggestions({ brands: [], categories: [], products: [], hasResults: true })
      setLoading(false)
      return
    }

    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const { data } = await axios.get(
          `/api/products/suggest?q=${encodeURIComponent(keyword.trim())}`,
          { signal: controller.signal }
        )
        setSuggestions(data)
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          setSuggestions({ brands: [], categories: [], products: [], hasResults: false })
        }
        return
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [keyword, aiMode])

  // ── Đóng dropdown khi click ra ngoài ──
  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setActiveIndex(-1)
  }, [keyword, isOpen])

  const runSearch = (term) => {
    const trimmed = term.trim()
    if (!trimmed) return
    saveToHistory(trimmed)
    setIsOpen(false)
    setKeyword(trimmed)
    if (aiMode) {
      history.push(`/smart-search?q=${encodeURIComponent(trimmed)}`)
    } else {
      history.push(`/?keyword=${encodeURIComponent(trimmed)}`)
    }
  }

  const goToProduct = (p) => {
    setIsOpen(false)
    history.push(`/product/${p._id}`)
  }
  const goToBrand = (b) => {
    setIsOpen(false)
    history.push(`/brand/${encodeURIComponent(b)}`)
  }
  const goToCategory = (c) => {
    setIsOpen(false)
    history.push(`/category/${encodeURIComponent(c)}`)
  }

  const submitHandler = (e) => {
    e.preventDefault()
    if (!keyword.trim()) {
      history.push('/')
      return
    }
    runSearch(keyword)
  }

  const trimmedKeyword = keyword.trim()
  const showingHistory = isOpen && !trimmedKeyword
  const historyMatches = trimmedKeyword
    ? searchHistory
        .filter((h) => h.keyword.toLowerCase().includes(trimmedKeyword.toLowerCase()))
        .slice(0, 3)
    : []

  const flatItems = showingHistory
    ? searchHistory.map((h) => ({ type: 'history', data: h }))
    : [
        ...historyMatches.map((h) => ({ type: 'history', data: h })),
        ...suggestions.brands.map((b) => ({ type: 'brand', data: b })),
        ...suggestions.products.map((p) => ({ type: 'product', data: p })),
        ...suggestions.categories.map((c) => ({ type: 'category', data: c })),
      ]

  const selectItem = (item) => {
    if (!item) return
    if (item.type === 'history') runSearch(item.data.keyword)
    else if (item.type === 'brand') { saveToHistory(trimmedKeyword); goToBrand(item.data) }
    else if (item.type === 'product') { saveToHistory(trimmedKeyword); goToProduct(item.data) }
    else if (item.type === 'category') { saveToHistory(trimmedKeyword); goToCategory(item.data) }
  }

  const onKeyDown = (e) => {
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        e.preventDefault()
        selectItem(flatItems[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  let runningIndex = -1
  const nextIndex = () => { runningIndex += 1; return runningIndex }

  const noResults = !showingHistory && !loading && trimmedKeyword && !suggestions.hasResults && historyMatches.length === 0

  return (
    <>
      <style>{STYLE}</style>
      <Form onSubmit={submitHandler} inline autoComplete='off'>
        <div ref={containerRef} style={{ position: 'relative', flex: 1, display: 'flex' }} className='flex-grow-1'>
          <Form.Control
            type='text'
            name='q'
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setIsOpen(true) }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={aiMode ? 'Mô tả nhu cầu, vd: điện thoại Samsung dưới 15 triệu...' : 'Tìm Kiếm Sản Phẩm...'}
            style={{
              background: '#0f0f23',
              border: `1px solid ${aiMode ? '#33FFCC' : 'rgba(51,255,204,0.4)'}`,
              color: '#ffffff',
              borderRadius: '12px',
              padding: '12px 44px 12px 16px',
              marginRight: '12px',
              width: '100%',
            }}
            className='flex-grow-1'
          />
          <button
            type='button'
            onClick={() => setAiMode((v) => !v)}
            title={aiMode ? 'Đang bật tìm kiếm AI (bấm để tắt)' : 'Bật tìm kiếm bằng AI (mô tả tự nhiên)'}
            style={{
              position: 'absolute', right: '22px', top: '50%', transform: 'translateY(-50%)',
              background: aiMode ? '#33FFCC' : 'transparent',
              border: 'none', borderRadius: '8px', width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <i className='fas fa-robot' style={{ color: aiMode ? '#0f0f23' : '#33FFCC', fontSize: '14px' }}></i>
          </button>

          {isOpen && !aiMode && (
            <div className='hs-search-dropdown'>
              {loading && (
                <div className='hs-search-loading'>
                  <Spinner animation='border' size='sm' /> Đang tìm...
                </div>
              )}

              {!loading && showingHistory && (
                searchHistory.length === 0 ? (
                  <div className='hs-search-empty-hint'>Bạn chưa có lịch sử tìm kiếm.</div>
                ) : (
                  <>
                    <div className='hs-search-group-label'>
                      <span>Lịch sử tìm kiếm</span>
                      <span className='hs-search-clear-all' onClick={clearAllHistory}>Xóa toàn bộ</span>
                    </div>
                    {searchHistory.map((h) => {
                      const idx = nextIndex()
                      return (
                        <div
                          key={h.keyword}
                          className={`hs-search-item${activeIndex === idx ? ' active' : ''}`}
                          onMouseDown={() => runSearch(h.keyword)}
                        >
                          <i className='fas fa-history hs-search-icon'></i>
                          <span>{h.keyword}</span>
                          <i
                            className='fas fa-times hs-search-remove'
                            onMouseDown={(e) => deleteHistoryItem(h.keyword, e)}
                          ></i>
                        </div>
                      )
                    })}
                  </>
                )
              )}

              {!loading && !showingHistory && trimmedKeyword && (
                <>
                  {historyMatches.length > 0 && (
                    <>
                      <div className='hs-search-group-label'><span>Lịch sử tìm kiếm</span></div>
                      {historyMatches.map((h) => {
                        const idx = nextIndex()
                        return (
                          <div
                            key={`hm-${h.keyword}`}
                            className={`hs-search-item${activeIndex === idx ? ' active' : ''}`}
                            onMouseDown={() => runSearch(h.keyword)}
                          >
                            <i className='fas fa-history hs-search-icon'></i>
                            <span><HighlightText text={h.keyword} query={trimmedKeyword} /></span>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {suggestions.brands.length > 0 && (
                    <>
                      <div className='hs-search-group-label'><span>Thương hiệu</span></div>
                      {suggestions.brands.map((b) => {
                        const idx = nextIndex()
                        return (
                          <div
                            key={`brand-${b}`}
                            className={`hs-search-item${activeIndex === idx ? ' active' : ''}`}
                            onMouseDown={() => { saveToHistory(trimmedKeyword); goToBrand(b) }}
                          >
                            <i className='fas fa-tag hs-search-icon'></i>
                            <span><HighlightText text={b} query={trimmedKeyword} /></span>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {suggestions.products.length > 0 && (
                    <>
                      <div className='hs-search-group-label'><span>Sản phẩm</span></div>
                      {suggestions.products.map((p) => {
                        const idx = nextIndex()
                        return (
                          <div
                            key={`product-${p._id}`}
                            className={`hs-search-item${activeIndex === idx ? ' active' : ''}`}
                            onMouseDown={() => { saveToHistory(trimmedKeyword); goToProduct(p) }}
                          >
                            <img src={p.image} alt='' className='hs-search-product-thumb' />
                            <div className='hs-search-product-info'>
                              <span className='hs-search-product-name'>
                                <HighlightText text={p.name} query={trimmedKeyword} />
                              </span>
                              <span className='hs-search-product-meta'>
                                {formatPrice(p.price)}
                                {p.rating > 0 && <Rating value={p.rating} color='#f8b400' />}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {suggestions.categories.length > 0 && (
                    <>
                      <div className='hs-search-group-label'><span>Danh mục</span></div>
                      {suggestions.categories.map((c) => {
                        const idx = nextIndex()
                        return (
                          <div
                            key={`cat-${c}`}
                            className={`hs-search-item${activeIndex === idx ? ' active' : ''}`}
                            onMouseDown={() => { saveToHistory(trimmedKeyword); goToCategory(c) }}
                          >
                            <i className='fas fa-folder hs-search-icon'></i>
                            <span><HighlightText text={c} query={trimmedKeyword} /></span>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {noResults && (
                    <div className='hs-search-empty-hint'>
                      <i className='fas fa-search' style={{ marginRight: 6 }}></i>
                      Không tìm thấy kết quả phù hợp.
                      <ul>
                        <li>Kiểm tra chính tả</li>
                        <li>Thử từ khóa khác</li>
                        <li>Xóa bớt ký tự</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <Button
          type='submit'
          style={{
            background: '#33FFCC',
            border: 'none',
            color: '#0f0f23',
            fontWeight: '700',
            borderRadius: '12px',
            padding: '12px 20px',
            boxShadow: '0 4px 15px rgba(51,255,204,0.3)'
          }}
        >
          <i className='fas fa-search me-1'></i>Tìm Kiếm
        </Button>
      </Form>
    </>
  )
}

export default SearchBox