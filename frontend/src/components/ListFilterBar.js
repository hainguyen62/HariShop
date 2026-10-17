import React, { useState, useEffect } from 'react'
import { lastDaysRange, thisMonthRange } from '../utils/listControls'

const inputStyle = {
  width: '100%',
  background: '#0f0f23',
  color: '#eef0f7',
  border: '1px solid rgba(51,255,204,0.3)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 13,
}
const labelStyle = { color: '#b8bcc8', fontSize: 12, marginBottom: 3, display: 'block' }
const linkBtn = {
  background: 'transparent',
  border: '1px solid rgba(51,255,204,0.35)',
  color: '#33FFCC',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  cursor: 'pointer',
}

// fields: [{ key, label, type: 'text'|'select'|'date'|'number', options, placeholder, advanced }]
// pairs: [['startDate','endDate'], ['minTotal','maxTotal']] để kiểm tra "từ" không lớn hơn "đến"
const ListFilterBar = ({ fields, values, defaults, onApply, pairs = [], quickDates = false, extra = null }) => {
  const [draft, setDraft] = useState(values)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setDraft(values) }, [values])

  const basic = fields.filter((f) => !f.advanced)
  const advanced = fields.filter((f) => f.advanced)
  const activeAdvanced = advanced.filter((f) => values[f.key] !== '' && values[f.key] !== undefined && values[f.key] !== defaults[f.key]).length

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const check = (v) => {
    for (const [from, to] of pairs) {
      if (v[from] !== '' && v[to] !== '' && v[from] !== undefined && v[to] !== undefined && Number(v[from].toString().replace(/-/g, '')) > Number(v[to].toString().replace(/-/g, ''))) {
        const label = fields.find((f) => f.key === from)?.label || from
        return `"${label}" đang lớn hơn giá trị "đến" tương ứng`
      }
    }
    return ''
  }

  const apply = (e) => {
    if (e) e.preventDefault()
    const msg = check(draft)
    setError(msg)
    if (!msg) onApply(draft)
  }

  const reset = () => {
    setError('')
    setDraft(defaults)
    onApply(defaults)
  }

  const quick = (range) => {
    const next = { ...draft, ...range }
    setDraft(next)
    setError('')
    onApply(next)
  }

  const renderField = (f) => (
    <div key={f.key} style={{ minWidth: f.type === 'text' ? 220 : 150, flex: f.type === 'text' ? '1 1 220px' : '0 1 170px' }}>
      <label style={labelStyle}>{f.label}</label>
      {f.type === 'select' ? (
        <select value={draft[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} style={inputStyle}>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={f.type}
          min={f.type === 'number' ? 0 : undefined}
          value={draft[f.key] ?? ''}
          placeholder={f.placeholder}
          onChange={(e) => setField(f.key, e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  )

  return (
    <form
      onSubmit={apply}
      style={{ background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.15)', borderRadius: 12, padding: 14, marginBottom: 16 }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {basic.map(renderField)}
        <button type='submit' style={{ ...linkBtn, background: '#33FFCC', color: '#0f0f23', fontWeight: 700 }}>
          <i className='fas fa-search me-1'></i>Lọc
        </button>
        {advanced.length > 0 && (
          <button type='button' style={linkBtn} onClick={() => setShowAdvanced((s) => !s)}>
            <i className={`fas fa-chevron-${showAdvanced ? 'up' : 'down'} me-1`}></i>
            Bộ lọc nâng cao{activeAdvanced > 0 ? ` (${activeAdvanced})` : ''}
          </button>
        )}
        <button type='button' style={{ ...linkBtn, borderColor: 'rgba(255,255,255,0.2)', color: '#b8bcc8' }} onClick={reset}>
          <i className='fas fa-times me-1'></i>Xoá lọc
        </button>
        {extra}
      </div>

      {showAdvanced && advanced.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {quickDates && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
              <span style={{ ...labelStyle, margin: 0 }}>Chọn nhanh:</span>
              <button type='button' style={linkBtn} onClick={() => quick(lastDaysRange(7))}>7 ngày</button>
              <button type='button' style={linkBtn} onClick={() => quick(lastDaysRange(30))}>30 ngày</button>
              <button type='button' style={linkBtn} onClick={() => quick(lastDaysRange(90))}>90 ngày</button>
              <button type='button' style={linkBtn} onClick={() => quick(thisMonthRange())}>Tháng này</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{advanced.map(renderField)}</div>
        </div>
      )}

      {error && <div style={{ color: '#ff6b6b', fontSize: 13, marginTop: 10 }}>{error}</div>}
    </form>
  )
}

export default ListFilterBar
