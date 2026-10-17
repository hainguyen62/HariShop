import axios from 'axios'
import { getApiError, saveBlob, readBlobError } from './invoiceActions'

const authConfig = (token, extra = {}) => ({ headers: { Authorization: `Bearer ${token}` }, ...extra })

const wrap = async (promise) => {
  try {
    const { data } = await promise
    return data
  } catch (error) {
    throw new Error(getApiError(error))
  }
}

const toQuery = (params) =>
  new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== '') acc[k] = v
      return acc
    }, {})
  ).toString()

export const fetchImportProducts = (token) => wrap(axios.get('/api/imports/products', authConfig(token)))

export const fetchLastImportCost = (token, productId, color) =>
  wrap(axios.get(`/api/imports/last-cost?${toQuery({ productId, color })}`, authConfig(token)))

export const createImport = (token, body) => wrap(axios.post('/api/imports', body, authConfig(token)))

export const fetchImports = (token, params) => wrap(axios.get(`/api/imports?${toQuery(params)}`, authConfig(token)))

export const deleteImport = (token, id) => wrap(axios.delete(`/api/imports/${id}`, authConfig(token)))

export const exportImportsExcel = async (token, { startDate, endDate }) => {
  try {
    const { data } = await axios.get(
      `/api/imports/export/excel?${toQuery({ startDate, endDate })}`,
      authConfig(token, { responseType: 'blob' })
    )
    saveBlob(data, `bao-cao-nhap-hang_${startDate}_${endDate}.xlsx`)
  } catch (error) {
    throw new Error(await readBlobError(error))
  }
}
