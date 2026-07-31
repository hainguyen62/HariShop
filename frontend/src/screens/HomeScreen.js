import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col } from 'react-bootstrap'
import Product from '../components/Product'
import Message from '../components/Message'
import Loader from '../components/Loader'
import Paginate from '../components/Paginate'
import ProductCarousel from '../components/ProductCarousel'
import SortDropdown from '../components/SortDropdown'
import Meta from '../components/Meta'
import { listProducts } from '../actions/productActions'

// ─── Data ──────────────────────────────────────────────────────────────────

const BRANDS = [
  { name: 'Apple', to: '/brand/Apple', img: '/images/apple.jpg', hint: 'Hệ sinh thái mạnh, thiết kế đẳng cấp' },
  { name: 'Samsung', to: '/brand/Samsung', img: '/images/samsung.jpg', hint: 'Màn hình đẹp, đa dạng phân khúc' },
  { name: 'Xiaomi', to: '/brand/Xiaomi', img: '/images/xiaomi.png', hint: 'Hiệu năng cao, giá tốt' },
  { name: 'OPPO', to: '/brand/OPPO', img: '/images/oppo.jpg', hint: 'Camera chân dung hàng đầu' },
  { name: 'Realme', to: '/brand/Realme', img: '/images/realme.jpg', hint: 'Trẻ trung, pin trâu, sạc nhanh' },
]

const PRICE_RANGES = [
  { label: 'Dưới 10 triệu', to: '/price/duoi-10tr', sub: 'Tiết kiệm, đủ dùng mượt mà', icon: 'fas fa-wallet' },
  { label: '10 – 20 triệu', to: '/price/10-20tr', sub: 'Cân bằng trải nghiệm & hiệu năng', icon: 'fas fa-layer-group' },
  { label: 'Trên 20 triệu', to: '/price/tren-20tr', sub: 'Flagship đỉnh cao, vượt trội', icon: 'fas fa-gem' },
]

const QUICK_PICK = [
  { label: 'iPhone', to: '/search/iphone', icon: 'fab fa-apple' },
  { label: 'Samsung', to: '/brand/Samsung', icon: 'fab fa-android' },
  { label: 'Gaming', to: '/search/gaming', icon: 'fas fa-gamepad' },
  { label: 'Camera đẹp', to: '/search/camera', icon: 'fas fa-camera-retro' },
]

const TICKER = ['Hàng chính hãng', 'Bảo hành minh bạch', 'Giao nhanh nội thành', 'Thu cũ đổi mới', 'Trả góp linh hoạt']

const STATS = [
  { icon: 'fas fa-shield-alt', label: 'Bảo hành', value: 'Chính hãng 12–24 tháng' },
  { icon: 'fas fa-truck', label: 'Giao hàng', value: 'Nhanh trong ngày' },
  { icon: 'fas fa-credit-card', label: 'Thanh toán', value: 'Trả góp 0%' },
]

const LANDING_BANNERS = {
  main: '/landingpages/landingpage1.jpg',
  b1: '/landingpages/landingpage2.jpg',
  b2: '/landingpages/langdingpage3.jpg',
}

// ─── Styles object ─────────────────────────────────────────────────────────

const S = {
  page: { padding: '0 0 40px', color: '#fff' },
  section: { marginTop: '32px' },
  sectionHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '12px', marginBottom: '20px',
  },
  sectionTag: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '6px 14px', borderRadius: '999px',
    background: 'rgba(51,255,204,0.1)',
    border: '1px solid rgba(51,255,204,0.2)',
    color: '#33FFCC', fontSize: '11px', fontWeight: '700',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: '800',
    margin: '6px 0 0', color: '#fff', lineHeight: 1.2,
  },

  // Hero
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: '28px',
    background: 'linear-gradient(145deg,#141428,#1a1a3e)',
    border: '1px solid rgba(51,255,204,0.12)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
  },
  heroBg: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background:
      'radial-gradient(800px 400px at 100% 0%, rgba(51,255,204,0.08), transparent 60%),' +
      'radial-gradient(600px 350px at 0% 100%, rgba(51,255,204,0.05), transparent 55%)',
  },
  heroInner: {
    position: 'relative', zIndex: 1,
    display: 'grid', gridTemplateColumns: '1.2fr 0.8fr',
    gap: '32px', padding: '48px 44px 44px', alignItems: 'center',
  },
  heroLabel: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '6px 14px', borderRadius: '999px',
    background: 'rgba(51,255,204,0.12)',
    border: '1px solid rgba(51,255,204,0.25)',
    color: '#33FFCC', fontSize: '12px', fontWeight: '700',
    letterSpacing: '0.05em',
  },
  heroDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#33FFCC', boxShadow: '0 0 0 5px rgba(51,255,204,0.15)',
  },
  heroTitle: {
    margin: '16px 0 12px',
    fontSize: 'clamp(2.2rem,5vw,3.5rem)', fontWeight: '900',
    lineHeight: 1.05, letterSpacing: '-0.03em',
  },
  heroAccent: { color: '#33FFCC' },
  heroSub: {
    maxWidth: '520px', margin: '0 0 24px',
    color: 'rgba(255,255,255,0.65)', fontSize: '15px',
    lineHeight: 1.8, fontWeight: '500',
  },
  heroActions: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '10px', padding: '14px 24px', borderRadius: '14px',
    background: 'linear-gradient(135deg,#33FFCC,#00D4AA)',
    color: '#0f0f23', fontWeight: '800', fontSize: '14px',
    textDecoration: 'none',
    boxShadow: '0 8px 24px rgba(51,255,204,0.25)',
    transition: 'all 0.25s ease', border: 'none', cursor: 'pointer',
  },
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '10px', padding: '14px 24px', borderRadius: '14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontWeight: '700', fontSize: '14px',
    textDecoration: 'none', transition: 'all 0.25s ease', cursor: 'pointer',
  },
  quickRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  quickChip: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '9px 14px', borderRadius: '999px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '700',
    textDecoration: 'none', transition: 'all 0.2s ease',
  },

  // Stats right
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  statCard: {
    padding: '18px', borderRadius: '20px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(8px)',
  },
  statIcon: {
    width: '40px', height: '40px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', borderRadius: '12px',
    background: 'rgba(51,255,204,0.1)', color: '#33FFCC',
    fontSize: '16px', marginBottom: '12px',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: '10px',
    fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: '4px',
  },
  statValue: { color: '#fff', fontSize: '13px', fontWeight: '700', lineHeight: 1.4 },

  // Promo banners
  promoBanners: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' },
  promoBanner: {
    position: 'relative', overflow: 'hidden', borderRadius: '18px',
    minHeight: '100px', border: '1px solid rgba(255,255,255,0.08)',
    textDecoration: 'none', display: 'block',
  },
  promoOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    padding: '14px 16px',
    background: 'linear-gradient(180deg,transparent 40%,rgba(15,15,35,0.85) 100%)',
  },
  promoTitle: { color: '#fff', fontWeight: '800', fontSize: '15px', lineHeight: 1.2 },
  promoSub: { color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: '600', marginTop: '2px' },

  // Card grid
  cardGrid: { display: 'grid', gap: '14px' },
  brandGrid: { gridTemplateColumns: 'repeat(5,1fr)' },
  priceGrid: { gridTemplateColumns: 'repeat(3,1fr)' },

  card: {
    padding: '22px 18px', borderRadius: '22px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    textDecoration: 'none', transition: 'all 0.25s ease',
    cursor: 'pointer', display: 'block',
  },
  cardIcon: {
    width: '52px', height: '52px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', borderRadius: '16px',
    background: 'rgba(51,255,204,0.08)', color: '#33FFCC',
    fontSize: '20px', marginBottom: '14px',
  },
  cardTitle: { color: '#fff', fontSize: '16px', fontWeight: '800', lineHeight: 1.3, marginBottom: '4px' },
  cardText: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.6, fontWeight: '500' },

  brandCard: { textAlign: 'center', paddingTop: '26px' },
  brandIconWrap: {
    width: '64px', height: '64px', margin: '0 auto 14px',
    borderRadius: '999px', overflow: 'hidden',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandImg: { width: '36px', height: '36px', objectFit: 'contain' },

  // Ticker
  ticker: {
    display: 'flex', alignItems: 'center', gap: '10px',
    overflow: 'hidden', padding: '14px 20px', marginTop: '24px',
    borderRadius: '999px', background: 'rgba(20,20,40,0.95)',
    border: '1px solid rgba(51,255,204,0.12)',
  },
  tickerTrack: {
    display: 'flex', gap: '32px', width: 'max-content',
    animation: 'tickerScroll 22s linear infinite',
  },
  tickerItem: {
    whiteSpace: 'nowrap', fontSize: '13px', fontWeight: '700',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },

  // Carousel
  carouselWrap: {
    borderRadius: '24px', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
  },

  // Result bar
  resultBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '16px', padding: '20px 24px',
    marginBottom: '24px', borderRadius: '22px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  resultBack: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '10px 16px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.06)', color: '#fff',
    fontWeight: '700', fontSize: '13px', textDecoration: 'none',
  },
  resultTitle: {
    margin: 0, fontSize: 'clamp(1.3rem,2.5vw,1.8rem)',
    fontWeight: '800', lineHeight: 1.2,
  },
  resultChip: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '8px 14px', borderRadius: '999px',
    background: 'rgba(51,255,204,0.08)',
    border: '1px solid rgba(51,255,204,0.15)',
    color: '#33FFCC', fontSize: '12px', fontWeight: '700',
  },

  // Product wrap
  productWrap: {
    borderRadius: '26px', padding: '14px 12px 8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },

  // Empty
  empty: {
    textAlign: 'center', padding: '60px 20px', borderRadius: '24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed rgba(255,255,255,0.12)',
  },
  emptyIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '72px', height: '72px', borderRadius: '50%',
    marginBottom: '16px', background: 'rgba(51,255,204,0.08)',
    color: '#33FFCC', fontSize: '26px',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.7,
    fontWeight: '500', maxWidth: '400px', margin: '0 auto 20px',
  },
  pager: { display: 'flex', justifyContent: 'center', marginTop: '32px' },
  countBadge: {
    padding: '8px 14px', borderRadius: '999px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)', fontSize: '12px',
    fontWeight: '700', whiteSpace: 'nowrap',
  },
}

// ─── Inject keyframe + override styles ─────────────────────────────────────

const KEYFRAME_STYLE = `
@keyframes tickerScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.luxHome a { color: inherit; text-decoration: none; }
.luxHome .product,
.luxHome .card {
  overflow: hidden;
  border-radius: 22px !important;
  background: linear-gradient(180deg, #121a2b, #0f1524) !important;
  border: 1px solid rgba(255,255,255,0.09) !important;
  box-shadow: 0 18px 34px rgba(0,0,0,0.22) !important;
}
.luxHome .card-body { background: transparent !important; }
.luxHome .card-title,
.luxHome .card-title a,
.luxHome .product-title,
.luxHome h3 a,
.luxHome h4 a {
  color: #f3f6ff !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  font-size: 1rem !important;
  line-height: 1.45 !important;
  font-weight: 800 !important;
}
.luxHome .card-text,
.luxHome .price,
.luxHome .product-price,
.luxHome strong.text-price,
.luxHome .text-price,
.luxHome .price strong {
  color: #33FFCC !important;
  font-size: 1.22rem !important;
  font-weight: 900 !important;
}
.luxHome .rating,
.luxHome .rating span,
.luxHome .rating svg,
.luxHome .product .rating {
  color: #33FFCC !important;
  fill: #33FFCC !important;
  font-weight: 800 !important;
}
.luxHome .btn-primary,
.luxHome .product .btn,
.luxHome .card .btn {
  border: none !important;
  border-radius: 14px !important;
  background: linear-gradient(135deg, #33FFCC, #00D4AA) !important;
  color: #0f0f23 !important;
  font-weight: 900 !important;
  box-shadow: 0 14px 26px rgba(0,212,170,0.2) !important;
}
.luxHome .btn-primary:hover,
.luxHome .product .btn:hover,
.luxHome .card .btn:hover {
  filter: brightness(1.03);
  transform: translateY(-1px);
}
@media (max-width:1199px) {
  .luxHome .brandGrid { grid-template-columns: repeat(3,1fr); }
}
@media (max-width:991px) {
  .luxHome .heroInner { grid-template-columns: 1fr; padding: 32px 24px 28px; }
  .luxHome .statsGrid { grid-template-columns: repeat(3,1fr); }
  .luxHome .brandGrid { grid-template-columns: repeat(3,1fr); }
  .luxHome .priceGrid { grid-template-columns: 1fr; }
}
@media (max-width:767px) {
  .luxHome .heroInner { padding: 24px 18px 20px; }
  .luxHome .statsGrid { grid-template-columns: 1fr 1fr; }
  .luxHome .brandGrid { grid-template-columns: 1fr 1fr; }
  .luxHome .promoBanners { grid-template-columns: 1fr; }
  .luxHome .resultBar { flex-direction: column; align-items: flex-start; }
  .luxHome .sectionHead { flex-direction: column; align-items: flex-start; }
}
@media (max-width:575px) {
  .luxHome .brandGrid { grid-template-columns: 1fr; }
  .luxHome .heroActions { flex-direction: column; }
  .luxHome .heroActions a { width: 100%; text-align: center; }
  .luxHome .heroActions a:first-child { width: 100%; }
}
`

if (typeof document !== 'undefined') {
  const id = 'hs-clean-style'
  const existing = document.getElementById(id)
  if (!existing) {
    const tag = document.createElement('style')
    tag.id = id
    tag.textContent = KEYFRAME_STYLE
    document.head.appendChild(tag)
  } else {
    existing.textContent = KEYFRAME_STYLE
  }
}

// ─── SectionHead ───────────────────────────────────────────────────────────

const SectionHead = ({ title, right }) => (
  <div className='sectionHead' style={S.sectionHead}>
    <div>
      <div style={S.sectionTag}>
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#33FFCC', display: 'inline-block',
          }}
        />
        <span>Nổi bật</span>
      </div>
      <h5 style={S.sectionTitle}>{title}</h5>
    </div>
    {right}
  </div>
)

// ─── HomeScreen ────────────────────────────────────────────────────────────

const HomeScreen = ({ match, location }) => {
  const keyword = location.search ? location.search.split('=')[1] : ''
  const decodedKeyword = keyword ? decodeURIComponent(keyword) : ''
  const pageNumber = match.params.pageNumber || 1

  const [sort, setSort] = useState('latest')
  let brand = ''
  let minPrice = ''
  let maxPrice = ''
  let rangeLabel = ''

  if (match.path.includes('/brand/:brand')) brand = match.params.brand

  if (match.path.includes('/price/:range')) {
    if (match.params.range === 'duoi-10tr') {
      minPrice = 0
      maxPrice = 10000000
      rangeLabel = 'Dưới 10 triệu'
    }
    if (match.params.range === '10-20tr') {
      minPrice = 10000000
      maxPrice = 20000000
      rangeLabel = '10 đến 20 triệu'
    }
    if (match.params.range === 'tren-20tr') {
      minPrice = 20000000
      rangeLabel = 'Trên 20 triệu'
    }
  }

  const isLanding = !decodedKeyword && !brand && !rangeLabel

  const dispatch = useDispatch()
  const productList = useSelector((state) => state.productList)
  const { loading, error, products = [], page, pages } = productList

  useEffect(() => {
    dispatch(listProducts({ keyword, brand, minPrice, maxPrice, sort }, pageNumber))
  }, [dispatch, keyword, brand, minPrice, maxPrice, sort, pageNumber])

  const resultTitle = decodedKeyword
    ? `Kết quả cho "${decodedKeyword}"`
    : brand
    ? `${brand} chính hãng`
    : rangeLabel
    ? `Điện thoại ${rangeLabel.toLowerCase()}`
    : 'Danh sách điện thoại'

  return (
    <div className='luxHome' style={S.page}>
      <Meta />

      {isLanding ? (
        <>
          {/* ══════ HERO ══════ */}
          <section style={S.hero}>
            <div style={S.heroBg} />
            <div style={S.heroInner}>
              {/* Left column */}
              <div>
                <div style={S.heroLabel}>
                  <span style={S.heroDot} />
                  <span>Flagship chính hãng 2026</span>
                </div>
                <h1 style={S.heroTitle}>
                  Săn điện thoại hot{' '}
                  <span style={S.heroAccent}>giá tốt, giao nhanh</span>
                </h1>
                <p style={S.heroSub}>
                  Ưu đãi rõ ràng, điều hướng nhanh theo nhu cầu — để bạn chọn đúng máy trong vài phút.
                </p>
                <div style={S.heroActions}>
                  <Link
                    to='/'
                    style={S.btnPrimary}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(51,255,204,0.35)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(51,255,204,0.25)'
                    }}
                  >
                    <i className='fas fa-fire' /> Mua ngay
                  </Link>
                  <Link
                    to='/search/iphone'
                    style={S.btnSecondary}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  >
                    <i className='fab fa-apple' /> iPhone bán chạy
                  </Link>
                  <Link
                    to='/brand/Samsung'
                    style={S.btnSecondary}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  >
                    <i className='fab fa-android' /> Samsung nổi bật
                  </Link>
                </div>
                <div style={S.quickRow}>
                  {QUICK_PICK.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      style={S.quickChip}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(51,255,204,0.1)'
                        e.currentTarget.style.borderColor = 'rgba(51,255,204,0.25)'
                        e.currentTarget.style.color = '#33FFCC'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                      }}
                    >
                      <i className={item.icon} style={{ color: '#33FFCC' }} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right column — Stats + Promo */}
              <div>
                <div style={S.statsGrid}>
                  {STATS.map((s) => (
                    <div key={s.label} style={S.statCard}>
                      <div style={S.statIcon}><i className={s.icon} /></div>
                      <div style={S.statLabel}>{s.label}</div>
                      <div style={S.statValue}>{s.value}</div>
                    </div>
                  ))}
                  <div style={{ ...S.statCard, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={S.statIcon}><i className='fas fa-star' /></div>
                    <div style={S.statLabel}>Đánh giá</div>
                    <div style={S.statValue}>99% hài lòng</div>
                  </div>
                </div>
                <div style={S.promoBanners}>
                  <Link to='/search/iphone' style={S.promoBanner}>
                    <img
                      src={LANDING_BANNERS.b1}
                      alt='iPhone'
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.75)' }}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                    <div style={S.promoOverlay}>
                      <div style={S.promoTitle}>iPhone hot</div>
                      <div style={S.promoSub}>Đổi nhanh – chốt gọn</div>
                    </div>
                  </Link>
                  <Link to='/brand/Samsung' style={S.promoBanner}>
                    <img
                      src={LANDING_BANNERS.b2}
                      alt='Samsung'
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.75)' }}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                    <div style={S.promoOverlay}>
                      <div style={S.promoTitle}>Samsung nổi bật</div>
                      <div style={S.promoSub}>Màn đẹp – trải nghiệm mượt</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ══════ BRANDS ══════ */}
          <section style={S.section}>
            <SectionHead title='Thương hiệu nổi bật' />
            <div style={{ ...S.cardGrid, ...S.brandGrid }} className='brandGrid'>
              {BRANDS.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  style={{ ...S.card, ...S.brandCard }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.borderColor = 'rgba(51,255,204,0.2)'
                    e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={S.brandIconWrap}>
                    <img
                      src={item.img}
                      alt={item.name}
                      style={S.brandImg}
                      onError={(event) => {
                        event.target.style.display = 'none'
                        const parent = event.target.parentNode
                        parent.innerHTML = '<i class="fas fa-mobile-alt" style="color:#33FFCC;font-size:22px"></i>'
                      }}
                    />
                  </div>
                  <div style={S.cardTitle}>{item.name}</div>
                  <div style={S.cardText}>{item.hint}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* ══════ PRICE RANGES ══════ */}
          <section style={S.section}>
            <SectionHead title='Chọn theo ngân sách' />
            <div style={{ ...S.cardGrid, ...S.priceGrid }} className='priceGrid'>
              {PRICE_RANGES.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  style={S.card}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.borderColor = 'rgba(51,255,204,0.2)'
                    e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={S.cardIcon}><i className={item.icon} /></div>
                  <div style={S.cardTitle}>{item.label}</div>
                  <div style={S.cardText}>{item.sub}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* ══════ CAROUSEL ══════ */}
          <section style={S.section}>
            <SectionHead
              title='Nổi bật trong tuần'
              right={<div style={S.countBadge}>Slider sản phẩm</div>}
            />
            <div style={S.carouselWrap}>
              <ProductCarousel />
            </div>
          </section>

          {/* ══════ TICKER ══════ */}
          <div style={S.ticker}>
            <span style={{ color: '#33FFCC', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>✦</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={S.tickerTrack} className='tickerTrack'>
                {[...TICKER, ...TICKER].map((item, i) => (
                  <span key={`${item}-${i}`} style={S.tickerItem}>• {item}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ══════ RESULT BAR (search / brand / price) ══════ */
        <div style={S.resultBar}>
          <Link to='/' style={S.resultBack}>
            <i className='fas fa-arrow-left' /> Trang chính
          </Link>
          <h2 style={S.resultTitle}>{resultTitle}</h2>
          <div style={S.resultChip}>
            <i className='fas fa-filter' /> Đang áp dụng
          </div>
        </div>
      )}

      {/* ══════ PRODUCT LISTING ══════ */}
      <section style={{ ...S.section, marginTop: isLanding ? 32 : 0 }}>
        <SectionHead
          title={isLanding ? 'Sản phẩm mới nhất' : 'Danh sách sản phẩm'}
          right={
            products.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={S.countBadge}>{products.length} sản phẩm</div>
                <div style={{ minWidth: '150px' }}>
                  <SortDropdown sort={sort} setSort={setSort} compact />
                </div>
              </div>
            ) : null
          }
        />

        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant='danger'>{error}</Message>
        ) : products.length === 0 ? (
          <div style={S.empty}>
            <div style={S.emptyIcon}><i className='fas fa-search' /></div>
            <p style={S.emptyText}>
              Hiện chưa có sản phẩm phù hợp. Bạn có thể quay lại trang chính để xem toàn bộ mẫu máy.
            </p>
            <Link
              to='/'
              style={S.btnPrimary}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(51,255,204,0.35)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(51,255,204,0.25)'
              }}
            >
              Xem tất cả sản phẩm
            </Link>
          </div>
        ) : (
          <div style={S.productWrap}>
            <Row className='g-3'>
              {products.map((product) => (
                <Col key={product._id} xs={12} sm={6} md={4} lg={4} xl={3}>
                  <Product product={product} />
                </Col>
              ))}
            </Row>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div style={S.pager}>
            <Paginate pages={pages} page={page} keyword={keyword} />
          </div>
        )}
      </section>
    </div>
  )
}

export default HomeScreen
