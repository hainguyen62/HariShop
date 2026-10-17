import axios from 'axios'
import { getApiError } from './invoiceActions'
import { toQueryString } from '../utils/listControls'

const authConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } })

const wrap = async (promise) => {
  try {
    const { data } = await promise
    return data
  } catch (error) {
    throw new Error(getApiError(error))
  }
}

export const fetchAgingStock = (token, params) =>
  wrap(axios.get(`/api/inventory/aging?${toQueryString(params)}`, authConfig(token)))

export const setProductAgingThreshold = (token, productId, agingThresholdDays) =>
  wrap(axios.put(`/api/inventory/aging/${productId}`, { agingThresholdDays }, authConfig(token)))

export const fetchInventorySettings = (token) => wrap(axios.get('/api/inventory/settings', authConfig(token)))

export const updateInventorySettings = (token, body) => wrap(axios.put('/api/inventory/settings', body, authConfig(token)))
