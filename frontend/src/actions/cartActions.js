import axios from 'axios'
import {
  CART_ADD_ITEM,
  CART_REMOVE_ITEM,
  CART_SAVE_SHIPPING_ADDRESS,
  CART_SAVE_PAYMENT_METHOD,
  CART_SAVE_DELIVERY_METHOD,
  CART_SAVE_VOUCHER_CODE,
  CART_SAVE_SHOP_MESSAGE,
  CART_SAVE_DELIVERY_FEE,
  CART_SAVE_VOUCHER_DISCOUNT,
  CART_SAVE_DELIVERY_PROVIDER,
  CART_SYNC_PRICES,
} from '../constants/cartConstants'
import { openLoginPrompt } from './loginPromptActions'

const authConfig = (getState) => ({
  headers: { Authorization: `Bearer ${getState().userLogin.userInfo.token}` },
})

const errorMessage = (error) =>
  error.response && error.response.data && error.response.data.message
    ? error.response.data.message
    : error.message

// Giỏ hàng nằm trên server, gắn với tài khoản; Redux chỉ giữ bản để hiển thị
export const loadCart = () => async (dispatch, getState) => {
  const { userInfo } = getState().userLogin
  if (!userInfo) return []
  try {
    const { data } = await axios.get('/api/cart', authConfig(getState))
    dispatch({ type: CART_SYNC_PRICES, payload: data.items })
    return data.changes || []
  } catch (error) {
    return []
  }
}

// Trả về { ok, reason, message }; chưa đăng nhập thì mở popup mời đăng nhập
export const addToCart = (id, qty, color = 'Mặc định') => async (dispatch, getState) => {
  const { userInfo } = getState().userLogin
  if (!userInfo) {
    dispatch(openLoginPrompt(window.location.pathname))
    return { ok: false, reason: 'login' }
  }

  // Đổi số lượng của dòng đã có thì cập nhật giao diện trước
  const existing = getState().cart.cartItems.find((x) => x.product === id && x.color === color)
  if (existing) dispatch({ type: CART_ADD_ITEM, payload: { ...existing, qty } })

  try {
    const { data } = await axios.put('/api/cart/item', { product: id, qty, color }, authConfig(getState))
    dispatch({ type: CART_SYNC_PRICES, payload: data.items })
    return { ok: true }
  } catch (error) {
    if (existing) dispatch(loadCart())
    return { ok: false, reason: 'error', message: errorMessage(error) }
  }
}

// Xóa theo product và color để không xóa nhầm dòng khác màu
export const removeFromCart = (productId, color = '') => async (dispatch, getState) => {
  dispatch({ type: CART_REMOVE_ITEM, payload: { product: productId, color } })
  try {
    await axios.post('/api/cart/remove', { product: productId, color }, authConfig(getState))
  } catch (error) {
    dispatch(loadCart())
  }
}

// Xóa các dòng đã đặt hàng khỏi giỏ trên server
export const removePurchasedFromServer = (items) => async (dispatch, getState) => {
  try {
    await axios.post('/api/cart/remove-purchased', { items }, authConfig(getState))
  } catch (error) {
    dispatch(loadCart())
  }
}

export const saveShippingAddress = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_SHIPPING_ADDRESS, payload: data })
  localStorage.setItem('shippingAddress', JSON.stringify(data))
}

export const savePaymentMethod = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_PAYMENT_METHOD, payload: data })
  localStorage.setItem('paymentMethod', JSON.stringify(data))
}

export const saveDeliveryMethod = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_DELIVERY_METHOD, payload: data })
  localStorage.setItem('deliveryMethod', JSON.stringify(data))
}

export const saveVoucherCode = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_VOUCHER_CODE, payload: data })
  localStorage.setItem('voucherCode', JSON.stringify(data))
}

export const saveShopMessage = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_SHOP_MESSAGE, payload: data })
  localStorage.setItem('shopMessage', JSON.stringify(data))
}

export const saveDeliveryFee = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_DELIVERY_FEE, payload: data })
  localStorage.setItem('deliveryFee', JSON.stringify(data))
}

export const saveVoucherDiscount = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_VOUCHER_DISCOUNT, payload: data })
  localStorage.setItem('voucherDiscount', JSON.stringify(data))
}

export const saveDeliveryProvider = (data) => (dispatch) => {
  dispatch({ type: CART_SAVE_DELIVERY_PROVIDER, payload: data })
  localStorage.setItem('deliveryProvider', JSON.stringify(data))
}

// Đối chiếu lại giá và tồn kho với dữ liệu hiện tại; trả về các sản phẩm đổi giá để UI báo
export const syncCartPrices = () => async (dispatch) => {
  const changes = await dispatch(loadCart())
  return changes
    .filter((c) => c.type === 'price')
    .map((c) => ({ name: c.name, oldPrice: c.oldPrice, newPrice: c.newPrice }))
}
