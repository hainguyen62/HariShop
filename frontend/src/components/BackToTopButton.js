import React, { useState, useEffect } from 'react'

const BackToTopButton = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      aria-label='Về đầu trang'
      style={{
        position: 'fixed', left: '24px', bottom: '24px', zIndex: 1045,
        width: '48px', height: '48px', borderRadius: '50%',
        background: '#1a1a2e', border: '1px solid rgba(51,255,204,0.35)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <i className='fas fa-arrow-up' style={{ color: '#33FFCC', fontSize: '18px' }}></i>
    </button>
  )
}

export default BackToTopButton
