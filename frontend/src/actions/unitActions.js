import axios from 'axios'
import { getApiError } from './invoiceActions'
import { toQueryString } from '../utils/listControls'

const authConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const wrap = async (promise) => {
  try {
    const { data } = await promise
    return data
  } catch (error) {
    const err = new Error(getApiError(error))
    const data = error.response && error.response.data
    if (data && data.abnormal) {
      err.abnormal = true
      err.detail = data
    }
    if (data && data.duplicate) {
      err.duplicate = true
      err.detail = data
    }
    throw err
  }
}

// ── Tem đơn vị ──
export const generateUnits = (token, body) => wrap(axios.post('/api/units/generate', body, authConfig(token)))
export const fetchUnits = (token, params) => wrap(axios.get(`/api/units?${toQueryString(params)}`, authConfig(token)))
export const voidUnits = (token, body) => wrap(axios.put('/api/units/void', body, authConfig(token)))
export const fetchUnitSummary = (token, productId) => wrap(axios.get(`/api/units/product/${productId}`, authConfig(token)))

// ── Phiên quét kiểm kê ──
export const createCountSession = (token, body) => wrap(axios.post('/api/count-sessions', body, authConfig(token)))
export const fetchCountSessions = (token, params) =>
  wrap(axios.get(`/api/count-sessions?${toQueryString(params)}`, authConfig(token)))
export const fetchCountSession = (token, id, includeUnscanned) =>
  wrap(axios.get(`/api/count-sessions/${id}${includeUnscanned ? '?includeUnscanned=1' : ''}`, authConfig(token)))
export const scanUnit = (token, id, code) => wrap(axios.post(`/api/count-sessions/${id}/scan`, { code }, authConfig(token)))
export const undoScan = (token, id, code) =>
  wrap(axios.delete(`/api/count-sessions/${id}/scan/${encodeURIComponent(code)}`, authConfig(token)))
export const closeCountSession = (token, id, body) =>
  wrap(axios.post(`/api/count-sessions/${id}/close`, body, authConfig(token)))

// ── Xuất kho đơn hàng bằng quét tem ──
export const fetchOrderExport = (token, orderId) => wrap(axios.get(`/api/orders/${orderId}/export`, authConfig(token)))
export const scanOrderExport = (token, orderId, code) =>
  wrap(axios.post(`/api/orders/${orderId}/export/scan`, { code }, authConfig(token)))
export const removeOrderExportScan = (token, orderId, code) =>
  wrap(axios.delete(`/api/orders/${orderId}/export/scan/${encodeURIComponent(code)}`, authConfig(token)))
export const completeOrderExport = (token, orderId, body) =>
  wrap(axios.put(`/api/orders/${orderId}/export/complete`, body, authConfig(token)))
