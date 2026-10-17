import axios from 'axios'
import { USER_LOGIN_SUCCESS } from '../constants/userConstants'
import { loadCart } from '../actions/cartActions'

// Cờ báo trình duyệt có thể còn cookie refresh; không chứa token
const FLAG = 'hs_session'

export const setSessionFlag = () => { try { localStorage.setItem(FLAG, '1') } catch (e) { /* bỏ qua */ } }
export const clearSessionFlag = () => { try { localStorage.removeItem(FLAG) } catch (e) { /* bỏ qua */ } }
const hasSessionFlag = () => { try { return localStorage.getItem(FLAG) === '1' } catch (e) { return false } }

let refreshPromise = null

// Nhiều request cùng lúc gặp 401 chỉ gọi làm mới một lần
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/users/refresh', null, { timeout: 8000, _skipAuthRetry: true })
      .then((res) => res.data)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

let interceptorReady = false

// Gặp 401 khi đang đăng nhập: làm mới token rồi gửi lại request; thất bại thì đăng xuất
export const setupAuthInterceptor = (store, onExpired) => {
  if (interceptorReady) return
  interceptorReady = true
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const cfg = error.config
      const status = error.response && error.response.status
      if (status !== 401 || !cfg || cfg._retry || cfg._skipAuthRetry) throw error
      const hadAuth = cfg.headers && (cfg.headers.Authorization || cfg.headers.authorization)
      if (!hadAuth) throw error
      if (/\/api\/users\/(login|refresh|logout)/.test(cfg.url || '')) throw error
      if (!store.getState().userLogin.userInfo) throw error
      try {
        const data = await refreshAccessToken()
        store.dispatch({ type: USER_LOGIN_SUCCESS, payload: data })
        cfg._retry = true
        cfg.headers.Authorization = `Bearer ${data.token}`
        return axios(cfg)
      } catch (e) {
        onExpired()
        throw error
      }
    }
  )
}

// Khi mở trang: xin token truy cập từ cookie refresh để giữ trạng thái đăng nhập
export const bootstrapAuth = async (store) => {
  try { localStorage.removeItem('userInfo') } catch (e) { /* dọn token 30 ngày kiểu cũ */ }
  if (!hasSessionFlag()) return
  try {
    const data = await refreshAccessToken()
    store.dispatch({ type: USER_LOGIN_SUCCESS, payload: data })
    await store.dispatch(loadCart())
  } catch (e) {
    // Chỉ bỏ cờ khi server xác nhận hết phiên; lỗi mạng thì giữ để lần sau thử lại
    if (e.response && e.response.status === 401) clearSessionFlag()
  }
}
