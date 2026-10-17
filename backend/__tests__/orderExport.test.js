import { planLines, checkScan, unitColorOf, availKey } from '../utils/orderExport.js'

const items = [
  { product: 'p1', color: 'Trắng', qty: 3, name: 'Xiaomi 14 Ultra' },
  { product: 'p2', color: 'Mặc định', qty: 1, name: 'Tai nghe' },
]
const hasColors = new Map([['p1', true], ['p2', false]])

describe('orderExport', () => {
  test('màu của sản phẩm không có màu được chuẩn hóa về rỗng', () => {
    expect(unitColorOf(items[1], hasColors)).toBe('')
    expect(unitColorOf(items[0], hasColors)).toBe('Trắng')
  })

  test('số tem cần quét không vượt số tem còn trong kho', () => {
    const available = new Map([[availKey('p1', 'Trắng'), 2], [availKey('p2', ''), 5]])
    const lines = planLines({ orderItems: items, scans: [], available, hasColors })
    expect(lines[0]).toMatchObject({ needScan: 2, manual: 1, done: false })
    expect(lines[1]).toMatchObject({ needScan: 1, manual: 0 })
  })

  test('hai dòng cùng sản phẩm và màu chia chung số tem còn trong kho', () => {
    const two = [{ product: 'p1', color: 'Trắng', qty: 2 }, { product: 'p1', color: 'Trắng', qty: 2 }]
    const lines = planLines({ orderItems: two, scans: [], available: new Map([[availKey('p1', 'Trắng'), 3]]), hasColors })
    expect(lines.map((l) => l.needScan)).toEqual([2, 1])
  })

  test('dòng không cần tem thì coi như đã xong', () => {
    const lines = planLines({ orderItems: [items[0]], scans: [], available: new Map(), hasColors })
    expect(lines[0]).toMatchObject({ needScan: 0, manual: 3, done: true })
  })

  test('chấp nhận tem đúng sản phẩm và màu', () => {
    const unit = { code: 'A', product: 'p1', color: 'Trắng', status: 'in_stock' }
    expect(checkScan({ unit, orderItems: items, scans: [], hasColors })).toEqual({ ok: true, itemIndex: 0 })
  })

  test('từ chối tem đã bán, đã hủy, không có, sai màu và quét trùng', () => {
    const base = { product: 'p1', color: 'Trắng', status: 'in_stock', code: 'A' }
    expect(checkScan({ unit: null, orderItems: items, scans: [], hasColors }).ok).toBe(false)
    expect(checkScan({ unit: { ...base, status: 'sold' }, orderItems: items, scans: [], hasColors }).error).toMatch(/đã bán/)
    expect(checkScan({ unit: { ...base, status: 'void' }, orderItems: items, scans: [], hasColors }).error).toMatch(/hủy/)
    expect(checkScan({ unit: { ...base, color: 'Đen' }, orderItems: items, scans: [], hasColors }).error).toMatch(/không thuộc/)
    expect(checkScan({ unit: base, orderItems: items, scans: [{ code: 'A', itemIndex: 0 }], hasColors }).error).toMatch(/đã quét cho đơn này/)
  })

  test('từ chối khi đã quét đủ số lượng của dòng', () => {
    const scans = [0, 1, 2].map((i) => ({ code: `S${i}`, itemIndex: 0 }))
    const unit = { code: 'NEW', product: 'p1', color: 'Trắng', status: 'in_stock' }
    expect(checkScan({ unit, orderItems: items, scans, hasColors }).error).toMatch(/đủ số lượng/)
  })
})
