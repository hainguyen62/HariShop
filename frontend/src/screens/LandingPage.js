import React from 'react'
import { Link } from 'react-router-dom'
import { Row, Col } from 'react-bootstrap'

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE - HariShop
// Dark theme, mobile-first, brand colors: #22e3b6 (mint), #1b1b32 (navy), #ffffff
// ═══════════════════════════════════════════════════════════════════════════════

// ─── DATA ─────────────────────────────────────────────────────────────────────

const BRANDS = [
  { name: 'Apple', to: '/brand/Apple', icon: 'fab fa-apple', hint: 'Hệ sinh thái mạnh, thiết kế đẳng cấp' },
  { name: 'Samsung', to: '/brand/Samsung', icon: 'fas fa-mobile-alt', hint: 'Màn hình đẹp, đa dạng phân khúc' },
  { name: 'Xiaomi', to: '/brand/Xiaomi', icon: 'fas fa-mobile-alt', hint: 'Hiệu năng cao, giá tốt nhất' },
]

const PRICE_RANGES = [
  { label: 'Dưới 10 triệu', to: '/price/duoi-10tr', sub: 'Tiết kiệm, đủ dùng mượt mà', icon: 'fas fa-wallet' },
  { label: '10 – 20 triệu', to: '/price/10-20tr', sub: 'Cân bằng trải nghiệm & hiệu năng', icon: 'fas fa-layer-group' },
  { label: 'Trên 20 triệu', to: '/price/tren-20tr', sub: 'Flagship đỉnh cao, vượt trội', icon: 'fas fa-gem' },
]

const TRUST_BADGES = [
  { icon: 'fas fa-shield-alt', title: 'Bảo hành chính hãng', desc: '12–24 tháng' },
  { icon: 'fas fa-percentage', title: 'Trả góp 0%', desc: 'Duyệt nhanh trong ngày' },
  { icon: 'fas fa-truck', title: 'Giao hàng nhanh', desc: 'Nội thành 2h, toàn quốc 24h' },
  { icon: 'fas fa-check-circle', title: 'Hàng chính hãng', desc: '100% nguyên seal' },
]

const FEATURES = [
  { icon: 'fas fa-robot', title: 'Chatbot AI tư vấn', desc: 'Trả lời mọi câu hỏi về sản phẩm 24/7' },
  { icon: 'fas fa-search', title: 'Tìm kiếm thông minh', desc: 'Ngôn ngữ tự nhiên, tìm đúng ý bạn' },
  { icon: 'fas fa-balance-scale', title: 'So sánh sản phẩm', desc: 'Đặt cạnh nhau, chọn dễ hơn' },
  { icon: 'fas fa-qrcode', title: 'Thanh toán QR', desc: 'QR động, an toàn, tức thì' },
  { icon: 'fas fa-tools', title: 'Tra cứu bảo hành', desc: 'Nhập IMEI, biết ngay hạn bảo hành' },
]

const HOT_PRODUCTS = [
  { name: 'iPhone 17 Pro Max', price: '34.990.000₫', image: '/images/iphone17.jpg', to: '/search/iphone' },
  { name: 'Samsung Galaxy S26 Ultra', price: '32.990.000₫', image: '/images/sss25.jpg', to: '/brand/Samsung' },
  { name: 'Xiaomi 15 Pro', price: '19.990.000₫', image: '/images/xiaomi15.jpg', to: '/brand/Xiaomi' },
]

// ─── STYLES (CSS-in-JS with responsive classes) ─────────────────────────────────

const S = {
  // Page wrapper
  page: {
    padding: '0 0 48px',
    color: '#ffffff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  // Section spacing
  section: { marginTop: '40px' },

  // Section header
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px',
  },
  sectionTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '999px',
    background: 'rgba(34,227,182,0.1)',
    border: '1px solid rgba(34,227,182,0.2)',
    color: '#22e3b6',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
    fontWeight: '800',
    margin: '6px 0 0',
    color: '#ffffff',
    lineHeight: 1.2,
  },

  // ═══ HERO ═══
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, #1b1b32 0%, #252547 50%, #1b1b32 100%)',
    border: '1px solid rgba(34,227,182,0.15)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
  },
  heroBg: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(600px 300px at 90% 10%, rgba(34,227,182,0.08), transparent 50%),' +
      'radial-gradient(500px 280px at 10% 90%, rgba(34,227,182,0.05), transparent 45%)',
  },
  heroInner: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '32px',
    padding: '40px 28px',
    alignItems: 'center',
  },
  heroLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '999px',
    background: 'rgba(34,227,182,0.12)',
    border: '1px solid rgba(34,227,182,0.25)',
    color: '#22e3b6',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  heroDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22e3b6',
    boxShadow: '0 0 0 4px rgba(34,227,182,0.15)',
  },
  heroTitle: {
    margin: '16px 0 12px',
    fontSize: 'clamp(1.8rem, 5vw, 3rem)',
    fontWeight: '900',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    color: '#ffffff',
  },
  heroAccent: { color: '#22e3b6' },
  heroSub: {
    maxWidth: '480px',
    margin: '0 0 24px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '15px',
    lineHeight: 1.7,
    fontWeight: '500',
  },
  heroCta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 28px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #22e3b6, #1bc9a0)',
    color: '#1b1b32',
    fontWeight: '800',
    fontSize: '15px',
    textDecoration: 'none',
    boxShadow: '0 8px 24px rgba(34,227,182,0.3)',
    transition: 'all 0.25s ease',
    border: 'none',
    cursor: 'pointer',
  },

  // ═══ BRAND CARDS ═══
  brandGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  brandCard: {
    padding: '28px 24px',
    borderRadius: '20px',
    background: 'rgba(27,27,50,0.6)',
    border: '1px solid rgba(34,227,182,0.1)',
    textDecoration: 'none',
    transition: 'all 0.25s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  brandIconWrap: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    background: 'rgba(34,227,182,0.1)',
    color: '#22e3b6',
    fontSize: '28px',
    flexShrink: 0,
  },
  brandContent: { flex: 1 },
  brandTitle: { color: '#ffffff', fontSize: '18px', fontWeight: '800', marginBottom: '4px' },
  brandHint: { color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.5 },

  // ═══ PRICE CARDS ═══
  priceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  priceCard: {
    padding: '24px',
    borderRadius: '20px',
    background: 'rgba(27,27,50,0.6)',
    border: '1px solid rgba(34,227,182,0.1)',
    textDecoration: 'none',
    transition: 'all 0.25s ease',
    cursor: 'pointer',
  },
  priceIcon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    background: 'rgba(34,227,182,0.1)',
    color: '#22e3b6',
    fontSize: '20px',
    marginBottom: '16px',
  },
  priceTitle: { color: '#ffffff', fontSize: '17px', fontWeight: '800', marginBottom: '6px' },
  priceSub: { color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.5 },

  // ═══ HOT PRODUCTS CAROUSEL ═══
  carouselWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  hotCard: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    background: 'rgba(27,27,50,0.6)',
    border: '1px solid rgba(34,227,182,0.1)',
    textDecoration: 'none',
    transition: 'all 0.25s ease',
  },
  hotImg: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderBottom: '1px solid rgba(34,227,182,0.1)',
  },
  hotContent: { padding: '20px' },
  hotBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(34,227,182,0.9)',
    color: '#1b1b32',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  hotName: { color: '#ffffff', fontSize: '16px', fontWeight: '800', marginBottom: '8px' },
  hotPrice: { color: '#22e3b6', fontSize: '18px', fontWeight: '900', marginBottom: '12px' },
  hotBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    background: 'rgba(34,227,182,0.1)',
    border: '1px solid rgba(34,227,182,0.2)',
    color: '#22e3b6',
    fontSize: '13px',
    fontWeight: '700',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  },

  // ═══ TRUST BADGES ═══
  trustGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  trustCard: {
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(27,27,50,0.4)',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
    transition: 'all 0.25s ease',
  },
  trustIcon: {
    width: '52px',
    height: '52px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    background: 'rgba(34,227,182,0.1)',
    color: '#22e3b6',
    fontSize: '22px',
    marginBottom: '14px',
  },
  trustTitle: { color: '#ffffff', fontSize: '15px', fontWeight: '800', marginBottom: '4px' },
  trustDesc: { color: 'rgba(255,255,255,0.5)', fontSize: '13px' },

  // ═══ FEATURES ═══
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  featureCard: {
    padding: '24px',
    borderRadius: '16px',
    background: 'rgba(27,27,50,0.4)',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    transition: 'all 0.25s ease',
  },
  featureIcon: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    background: 'rgba(34,227,182,0.1)',
    color: '#22e3b6',
    fontSize: '18px',
    flexShrink: 0,
  },
  featureTitle: { color: '#ffffff', fontSize: '15px', fontWeight: '800', marginBottom: '4px' },
  featureDesc: { color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.5 },
}

// ─── INJECT RESPONSIVE CSS ─────────────────────────────────────────────────────

const RESPONSIVE_CSS = `
.landing-page a { color: inherit; text-decoration: none; }

@media (min-width: 768px) {
  .landing-hero-inner {
    grid-template-columns: 1.2fr 0.8fr !important;
    padding: 56px 48px !important;
  }
}

@media (max-width: 767px) {
  .landing-hero-inner { padding: 32px 20px !important; }
  .landing-section { margin-top: 32px !important; }
}

/* Hover states */
.landing-brand-card:hover,
.landing-price-card:hover,
.landing-hot-card:hover {
  transform: translateY(-4px);
  border-color: rgba(34,227,182,0.3);
  box-shadow: 0 16px 40px rgba(0,0,0,0.3);
}

.landing-hot-btn:hover {
  background: rgba(34,227,182,0.2);
  border-color: rgba(34,227,182,0.4);
}

.landing-trust-card:hover,
.landing-feature-card:hover {
  background: rgba(27,27,50,0.6);
  border-color: rgba(34,227,182,0.15);
}
`

if (typeof document !== 'undefined') {
  const id = 'landing-page-styles'
  const existing = document.getElementById(id)
  if (!existing) {
    const tag = document.createElement('style')
    tag.id = id
    tag.textContent = RESPONSIVE_CSS
    document.head.appendChild(tag)
  }
}

// ─── SECTION HEAD COMPONENT ───────────────────────────────────────────────────

const SectionHead = ({ title, tag = 'Nổi bật' }) => (
  <div style={S.sectionHead}>
    <div>
      <div style={S.sectionTag}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22e3b6', display: 'inline-block' }} />
        <span>{tag}</span>
      </div>
      <h2 style={S.sectionTitle}>{title}</h2>
    </div>
  </div>
)

// ─── MAIN LANDING PAGE COMPONENT ──────────────────────────────────────────────

const LandingPage = () => {
  return (
    <div className="landing-page" style={S.page}>

      {/* ════════ HERO SECTION ════════ */}
      <section style={S.hero}>
        <div style={S.heroBg} />
        <div style={{ ...S.heroInner }} className="landing-hero-inner">
          <div>
            <div style={S.heroLabel}>
              <span style={S.heroDot} />
              <span>Cửa hàng điện thoại online</span>
            </div>
            <h1 style={S.heroTitle}>
              Săn điện thoại hot{' '}
              <span style={S.heroAccent}>giá tốt</span>
            </h1>
            <p style={S.heroSub}>
              HariShop — điện thoại chính hãng, bảo hành minh bạch, giao nhanh toàn quốc.
              Chọn đúng máy trong vài phút.
            </p>
            <Link
              to="/"
              style={S.heroCta}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(34,227,182,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(34,227,182,0.3)'
              }}
            >
              <i className="fas fa-bolt" /> Khám phá ngay
            </Link>
          </div>

          {/* Right side - visual placeholder */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              padding: '40px',
              borderRadius: '20px',
              background: 'rgba(34,227,182,0.05)',
              border: '1px solid rgba(34,227,182,0.1)',
            }}>
              <i className="fas fa-mobile-alt" style={{ fontSize: '80px', color: '#22e3b6', marginBottom: '16px' }} />
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>
                100% Hàng chính hãng
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ BRANDS ════════ */}
      <section style={S.section} className="landing-section">
        <SectionHead title="Thương hiệu nổi bật" />
        <div style={S.brandGrid}>
          {BRANDS.map((brand) => (
            <Link
              key={brand.name}
              to={brand.to}
              style={S.brandCard}
              className="landing-brand-card"
            >
              <div style={S.brandIconWrap}>
                <i className={brand.icon} />
              </div>
              <div style={S.brandContent}>
                <div style={S.brandTitle}>{brand.name}</div>
                <div style={S.brandHint}>{brand.hint}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════ PRICE RANGES ════════ */}
      <section style={S.section} className="landing-section">
        <SectionHead title="Chọn theo ngân sách" tag="Phù hợp túi tiền" />
        <div style={S.priceGrid}>
          {PRICE_RANGES.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={S.priceCard}
              className="landing-price-card"
            >
              <div style={S.priceIcon}><i className={item.icon} /></div>
              <div style={S.priceTitle}>{item.label}</div>
              <div style={S.priceSub}>{item.sub}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════ HOT PRODUCTS ════════ */}
      <section style={S.section} className="landing-section">
        <SectionHead title="Sản phẩm nổi bật trong tuần" tag="Hot" />
        <div style={S.carouselWrap}>
          {HOT_PRODUCTS.map((product, idx) => (
            <Link
              key={product.name}
              to={product.to}
              style={S.hotCard}
              className="landing-hot-card"
            >
              <span style={S.hotBadge}>
                <i className="fas fa-fire" style={{ marginRight: 4 }} />
                #{idx + 1}
              </span>
              <img
                src={product.image}
                alt={product.name}
                style={S.hotImg}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231b1b32" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2322e3b6" font-size="30">📱</text></svg>'
                }}
              />
              <div style={S.hotContent}>
                <div style={S.hotName}>{product.name}</div>
                <div style={S.hotPrice}>{product.price}</div>
                <span style={S.hotBtn} className="landing-hot-btn">
                  <i className="fas fa-eye" /> Xem ngay
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════ TRUST BADGES ════════ */}
      <section style={S.section} className="landing-section">
        <SectionHead title="Tại sao chọn HariShop?" tag="Uy tín" />
        <div style={S.trustGrid}>
          {TRUST_BADGES.map((badge) => (
            <div key={badge.title} style={S.trustCard} className="landing-trust-card">
              <div style={S.trustIcon}><i className={badge.icon} /></div>
              <div style={S.trustTitle}>{badge.title}</div>
              <div style={S.trustDesc}>{badge.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section style={S.section} className="landing-section">
        <SectionHead title="Tính năng nổi bật" tag="Công nghệ" />
        <div style={S.featureGrid}>
          {FEATURES.map((feat) => (
            <div key={feat.title} style={S.featureCard} className="landing-feature-card">
              <div style={S.featureIcon}><i className={feat.icon} /></div>
              <div>
                <div style={S.featureTitle}>{feat.title}</div>
                <div style={S.featureDesc}>{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

export default LandingPage
