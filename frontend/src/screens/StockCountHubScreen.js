import React from 'react'
import Meta from '../components/Meta'
import StockCountListScreen from './StockCountListScreen'
import CountSessionListScreen from './CountSessionListScreen'
import UnitLabelsScreen from './UnitLabelsScreen'

const TABS = [
  { key: 'sessions', label: 'Phiên quét', icon: 'fa-qrcode' },
  { key: 'manual', label: 'Đếm tay theo sản phẩm', icon: 'fa-pen' },
  { key: 'history', label: 'Lịch sử', icon: 'fa-history' },
  { key: 'labels', label: 'In tem từng máy', icon: 'fa-tags' },
]

// Mở thẳng tab theo đường dẫn cũ nếu người dùng vào bằng link cũ
const defaultTab = (pathname) => {
  if (pathname.startsWith('/admin/unit-labels')) return 'labels'
  return 'sessions'
}

const StockCountHubScreen = ({ location, history }) => {
  const query = new URLSearchParams(location.search)
  const requested = query.get('tab')
  const tab = TABS.some((t) => t.key === requested) ? requested : defaultTab(location.pathname)

  const go = (key) => history.push(`/admin/stock-count?tab=${key}`)

  return (
    <div>
      <Meta title='Kiểm kê kho' />
      <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: 16 }}>
        <i className='fas fa-clipboard-check me-2' style={{ color: '#33FFCC' }}></i>Kiểm kê kho
      </h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key} type='button' onClick={() => go(t.key)}
            style={{
              background: tab === t.key ? '#33FFCC' : 'transparent',
              color: tab === t.key ? '#0f0f23' : '#33FFCC',
              border: '1px solid #33FFCC', borderRadius: 999, padding: '8px 18px', fontWeight: 700, fontSize: 14,
            }}
          >
            <i className={`fas ${t.icon} me-2`}></i>{t.label}
          </button>
        ))}
      </div>

      {tab === 'sessions' && <CountSessionListScreen history={history} />}
      {tab === 'manual' && <StockCountListScreen section='products' />}
      {tab === 'history' && <StockCountListScreen section='history' />}
      {tab === 'labels' && <UnitLabelsScreen location={location} />}
    </div>
  )
}

export default StockCountHubScreen
