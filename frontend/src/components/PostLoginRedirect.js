import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useHistory, useLocation } from 'react-router-dom'
import { rememberRedirect, takeRedirect } from '../utils/redirectTarget'

const AUTH_PATHS = ['/login', '/register']

// Đưa khách về trang đã mở trước khi bị mời đăng nhập, dùng được cho cả đăng nhập email và Google
const PostLoginRedirect = () => {
  const history = useHistory()
  const location = useLocation()
  const userInfo = useSelector((state) => state.userLogin.userInfo)

  useEffect(() => {
    if (!AUTH_PATHS.includes(location.pathname)) return
    const value = new URLSearchParams(location.search).get('redirect')
    if (value) rememberRedirect(value.startsWith('/') ? value : `/${value}`)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!userInfo) return
    const target = takeRedirect()
    if (target && target !== history.location.pathname) history.replace(target)
  }, [userInfo, history])

  return null
}

export default PostLoginRedirect
