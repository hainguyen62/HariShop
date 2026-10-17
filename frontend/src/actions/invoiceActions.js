import axios from 'axios'

const authConfig = (token, extra = {}) => ({ headers: { Authorization: `Bearer ${token}` }, ...extra })

export const getApiError = (error) =>
  (error.response && error.response.data && error.response.data.message) || error.message || 'Đã xảy ra lỗi'

export const readBlobError = async (error) => {
  const data = error.response && error.response.data
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || error.message
    } catch (e) {
      return error.message
    }
  }
  return getApiError(error)
}

export const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const downloadInvoice = async (orderId, token) => {
  try {
    const { data } = await axios.get(`/api/orders/${orderId}/invoice`, authConfig(token, { responseType: 'blob' }))
    saveBlob(data, `hoa-don-${String(orderId).slice(-6).toUpperCase()}.pdf`)
  } catch (error) {
    throw new Error(await readBlobError(error))
  }
}

export const sendInvoiceEmail = async (orderId, token) => {
  try {
    const { data } = await axios.post(`/api/orders/${orderId}/invoice/send`, {}, authConfig(token))
    return data
  } catch (error) {
    throw new Error(getApiError(error))
  }
}
