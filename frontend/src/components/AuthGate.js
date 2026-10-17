import React, { useEffect, useState } from 'react'
import { useStore } from 'react-redux'
import { bootstrapAuth, setupAuthInterceptor } from '../utils/authSession'
import { logout } from '../actions/userActions'

// Khôi phục phiên đăng nhập từ cookie trước khi hiển thị ứng dụng, tránh nháy về trang đăng nhập
const AuthGate = ({ children }) => {
  const store = useStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setupAuthInterceptor(store, () => store.dispatch(logout(true)))
    let alive = true
    bootstrapAuth(store).finally(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [store])

  if (!ready) return <div style={{ minHeight: '100vh' }} />
  return children
}

export default AuthGate
