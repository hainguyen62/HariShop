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

export const fetchCountProduct = (token, id) => wrap(axios.get(`/api/stockcounts/product/${id}`, authConfig(token)))

export const createStockCount = (token, body) => wrap(axios.post('/api/stockcounts', body, authConfig(token)))

export const fetchStockCounts = (token, params) =>
  wrap(axios.get(`/api/stockcounts?${toQueryString(params)}`, authConfig(token)))
