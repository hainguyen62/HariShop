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

export const fetchForecastOverview = (token, params) =>
  wrap(axios.get(`/api/forecast/overview?${toQueryString(params)}`, authConfig(token)))

export const fetchProductForecast = (token, id, params) =>
  wrap(axios.get(`/api/forecast/product/${id}?${toQueryString(params)}`, authConfig(token)))

export { updateInventorySettings } from './inventoryActions'

export const fetchForecastAdvice = (token, params) =>
  wrap(axios.post('/api/forecast/advice', params, authConfig(token)))
