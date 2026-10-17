import { validateImportInput, resolveStockTarget, computeImportTotal } from '../utils/stockImport.js'

describe('validateImportInput', () => {
  it('chấp nhận dữ liệu hợp lệ', () => {
    expect(validateImportInput({ quantity: 10, unitCost: 15000000 })).toBeNull()
    expect(validateImportInput({ quantity: '5', unitCost: '0', importedAt: '2026-09-01' })).toBeNull()
  })
  it('từ chối số lượng không hợp lệ', () => {
    expect(validateImportInput({ quantity: 0, unitCost: 1 })).toMatch(/Số lượng/)
    expect(validateImportInput({ quantity: -3, unitCost: 1 })).toMatch(/Số lượng/)
    expect(validateImportInput({ quantity: 2.5, unitCost: 1 })).toMatch(/Số lượng/)
    expect(validateImportInput({ quantity: 'abc', unitCost: 1 })).toMatch(/Số lượng/)
    expect(validateImportInput({ quantity: 100001, unitCost: 1 })).toMatch(/tối đa/)
  })
  it('từ chối giá nhập không hợp lệ', () => {
    expect(validateImportInput({ quantity: 1, unitCost: -1 })).toMatch(/Giá nhập/)
    expect(validateImportInput({ quantity: 1, unitCost: 'abc' })).toMatch(/Giá nhập/)
    expect(validateImportInput({ quantity: 1, unitCost: undefined })).toMatch(/Giá nhập/)
  })
  it('từ chối ngày nhập sai', () => {
    expect(validateImportInput({ quantity: 1, unitCost: 1, importedAt: 'không phải ngày' })).toMatch(/Ngày nhập/)
  })
})

describe('resolveStockTarget', () => {
  const withColors = {
    countInStock: 4,
    colors: [{ name: 'Trắng', countInStock: 1 }, { name: 'Đen', countInStock: 3 }],
  }
  it('sản phẩm có màu: lấy tồn của đúng màu', () => {
    expect(resolveStockTarget(withColors, 'Trắng')).toEqual({ hasColors: true, color: 'Trắng', stockBefore: 1 })
  })
  it('sản phẩm có màu: bắt buộc chọn màu, màu phải tồn tại', () => {
    expect(resolveStockTarget(withColors, '').error).toMatch(/chọn màu/)
    expect(resolveStockTarget(withColors, 'Tím').error).toMatch(/không có màu/)
  })
  it('sản phẩm không có màu: dùng tồn kho chung, bỏ qua màu truyền lên', () => {
    expect(resolveStockTarget({ countInStock: 7, colors: [] }, 'Đen')).toEqual({ hasColors: false, color: '', stockBefore: 7 })
  })
  it('ví dụ yêu cầu: tồn 1, nhập 10 thì tồn sau là 11', () => {
    const t = resolveStockTarget(withColors, 'Trắng')
    expect(t.stockBefore + 10).toBe(11)
  })
})

describe('computeImportTotal', () => {
  it('nhân số lượng với giá nhập và làm tròn', () => {
    expect(computeImportTotal(10, 15500000)).toBe(155000000)
    expect(computeImportTotal(3, 100.4)).toBe(301)
  })
})
