import { codAmountOf, isCodShipment, isReadyToShip } from '../utils/orderPayment.js'

describe('orderPayment', () => {
  const online = { paymentMethod: 'online', totalPrice: 44000000, isPaid: false }

  test('đơn online chưa đủ tiền không được đẩy sang vận chuyển', () => {
    expect(isReadyToShip(online)).toBe(false)
    expect(isReadyToShip({ ...online, paymentReceivedAmount: 40000000 })).toBe(false)
  })

  test('đơn online đã thanh toán, đơn COD và COD phần còn lại được đẩy', () => {
    expect(isReadyToShip({ ...online, isPaid: true })).toBe(true)
    expect(isReadyToShip({ paymentMethod: 'cod', totalPrice: 1 })).toBe(true)
    expect(isReadyToShip({ ...online, partialCod: true })).toBe(true)
  })

  test('đơn đã hủy không được đẩy', () => {
    expect(isReadyToShip({ paymentMethod: 'cod', isCancelled: true })).toBe(false)
    expect(isReadyToShip({ ...online, isPaid: true, status: 'cancelled' })).toBe(false)
  })

  test('số tiền thu hộ', () => {
    expect(codAmountOf({ paymentMethod: 'cod', totalPrice: 5000000 })).toBe(5000000)
    expect(codAmountOf({ ...online, partialCod: true, codRemainderAmount: 4000000 })).toBe(4000000)
    expect(codAmountOf({ ...online, isPaid: true })).toBe(0)
    expect(isCodShipment({ ...online, partialCod: true })).toBe(true)
    expect(isCodShipment(online)).toBe(false)
  })
})
