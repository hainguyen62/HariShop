// Số tiền shipper thu hộ: COD thu toàn bộ, COD phần còn lại chỉ thu phần thiếu, đơn online đã trả thì 0
export const codAmountOf = (order) => {
  if (order.paymentMethod === 'cod') return Number(order.totalPrice || 0)
  if (order.partialCod) return Number(order.codRemainderAmount || 0)
  return 0
}

export const isCodShipment = (order) => order.paymentMethod === 'cod' || Boolean(order.partialCod)

// Chỉ được đẩy sang đơn vị vận chuyển khi đã rõ cách thu tiền: COD, đã thanh toán đủ, hoặc COD phần còn lại
export const isReadyToShip = (order) =>
  !order.isCancelled && order.status !== 'cancelled' &&
  (order.paymentMethod === 'cod' || Boolean(order.isPaid) || Boolean(order.partialCod))
