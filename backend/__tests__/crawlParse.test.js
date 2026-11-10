import { parsePrice, guessBrand, cleanName, mapSpecs, parseColorLines, parseRobots, isAllowedByRobots, describeFromSpecs, simplifyCamera, isProductUrl, guessHex } from '../utils/crawlParse.js'

describe('parsePrice', () => {
  it('đọc giá có dấu chấm và ký hiệu đồng', () => {
    expect(parsePrice('37.990.000₫')).toBe(37990000)
    expect(parsePrice('Giá: 8.490.000 đ')).toBe(8490000)
  })
  it('không có giá thì trả 0', () => {
    expect(parsePrice('Liên hệ')).toBe(0)
  })
})

describe('guessBrand và cleanName', () => {
  it('nhận hãng theo tên máy', () => {
    expect(guessBrand('iPhone 16 Pro Max 512GB')).toBe('Apple')
    expect(guessBrand('Samsung Galaxy S25 Ultra')).toBe('Samsung')
    expect(guessBrand('Redmi Note 14')).toBe('Xiaomi')
    expect(guessBrand('Máy lạ')).toBe('')
  })
  it('bỏ phần quảng cáo sau tên', () => {
    expect(cleanName('iPhone 16 Pro Max 512GB giá giảm đến 7,5 triệu, chính hãng')).toBe('iPhone 16 Pro Max 512GB')
    expect(cleanName('Galaxy S25 | CellphoneS')).toBe('Galaxy S25')
  })
})

describe('mapSpecs', () => {
  it('ghép nhãn tiếng Việt vào đúng trường', () => {
    const { specs, weight } = mapSpecs([
      ['Chipset', 'Apple A18 Pro'],
      ['Bộ nhớ trong', '512 GB'],
      ['Kích thước màn hình', '6.9 inches'],
      ['Camera sau', 'Chính 48 MP & Phụ 48 MP, 12 MP'],
      ['Dung lượng pin', '4685 mAh'],
      ['Trọng lượng', '227 g'],
      ['Thẻ SIM', '2 SIM (nano-SIM và eSIM)'],
    ])
    expect(specs.chip).toBe('Apple A18 Pro')
    expect(specs.storage).toBe('512 GB')
    expect(specs.battery).toBe(4685)
    expect(specs.sim).toMatch(/eSIM/)
    expect(weight).toBe(227)
  })
  it('nhãn lạ bị bỏ qua', () => {
    expect(mapSpecs([['Màu bất kỳ', 'Đen']]).specs.chip).toBe('')
  })
})

describe('parseColorLines', () => {
  it('lấy tên màu và giá, bỏ dòng chỉ là dung lượng', () => {
    const colors = parseColorLines(['Titan Đen 37.990.000₫', 'Titan Sa Mạc 38.990.000₫', '512GB 37.990.000₫', 'Titan Đen 37.990.000₫'])
    expect(colors).toEqual([{ name: 'Titan Đen', price: 37990000 }, { name: 'Titan Sa Mạc', price: 38990000 }])
  })
})

describe('robots.txt', () => {
  const rules = parseRobots('User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /cart\nDisallow: /api/\nAllow: /api/public')
  it('chặn đường dẫn bị cấm cho mọi bot', () => {
    expect(isAllowedByRobots(rules, '/cart/1')).toBe(false)
    expect(isAllowedByRobots(rules, '/api/x')).toBe(false)
  })
  it('Allow dài hơn thắng, đường dẫn khác được phép', () => {
    expect(isAllowedByRobots(rules, '/api/public/a')).toBe(true)
    expect(isAllowedByRobots(rules, '/iphone-16.html')).toBe(true)
  })
})

describe('describeFromSpecs', () => {
  it('viết mô tả từ thông số', () => {
    expect(describeFromSpecs('Máy A', { chip: 'X1', ram: '8GB' })).toBe('Máy A trang bị chip X1, RAM 8GB.')
    expect(describeFromSpecs('Máy B', {})).toBe('Máy B, hàng chính hãng.')
  })
})

describe('parseColorLines với văn bản dính liền', () => {
  it('không tách nhầm chữ số đầu của giá thành tên màu', () => {
    expect(parseColorLines(['37.990.000₫', 'Titan Đen37.990.000₫'])).toEqual([{ name: 'Titan Đen', price: 37990000 }])
  })
})

describe('giá viết bằng chữ đ và camera dài', () => {
  it('nhận cả ký hiệu đ', () => {
    expect(parseColorLines(['Titan Trắng 37.990.000đ'])).toEqual([{ name: 'Titan Trắng', price: 37990000 }])
  })
  it('rút camera về dạng ngắn', () => {
    expect(simplifyCamera('Camera chính: 48MP, f/1.78, 24mm Telephoto 2x 12MP: 52 mm Camera góc siêu rộng: 48MP, 13 mm')).toBe('48MP + 12MP')
    expect(simplifyCamera('12MP, ƒ/1.9, Tự động lấy nét theo pha Focus Pixels')).toBe('12MP')
  })
})

describe('isProductUrl', () => {
  it('nhận link điện thoại mới ở gốc trang', () => {
    expect(isProductUrl('/iphone-16-pro-max.html')).toBe('https://cellphones.com.vn/iphone-16-pro-max.html')
    expect(isProductUrl('https://cellphones.com.vn/galaxy-s25-ultra.html?x=1#a')).toBe('https://cellphones.com.vn/galaxy-s25-ultra.html')
  })
  it('loại máy cũ, phụ kiện, trang danh mục, trang ngoài', () => {
    expect(isProductUrl('/iphone-16-pro-max-512gb-cu-dep.html')).toBe('')
    expect(isProductUrl('/iphone-16-pro-max-512gb-cu-doi-bao-hanh.html')).toBe('')
    expect(isProductUrl('/mobile/apple/iphone-16.html')).toBe('')
    expect(isProductUrl('/khuyen-mai.html')).toBe('')
    expect(isProductUrl('https://example.com/iphone-16.html')).toBe('')
  })
})

describe('parseColorLines lọc nhãn không phải màu', () => {
  it('bỏ tiêu đề, giá cho bạn, điểm benchmark, phiên bản', () => {
    const out = parseColorLines([
      'Màu sắcXanh dương16.090.000đ',
      'Xanh dương16.090.000đ',
      'Tím16.090.000đ',
      'Antutu Benchmark: đạt 2.080.769 điểm 2.080.769đ',
      'Giá cho bạn: 20.990.000đ',
      '17T 5G 12GB 512GB 16.090.000đ',
      'Đặt cọc 400.000đ',
      'Đen400.000đ',
    ])
    expect(out.map((c) => c.name)).toEqual(['Xanh dương', 'Tím'])
  })
})

describe('guessHex', () => {
  it('đoán màu từ tên', () => {
    expect(guessHex('Xanh dương')).toBe('#3b82f6')
    expect(guessHex('Titan Sa Mạc')).toBe('#c2a27c')
    expect(guessHex('Đen')).toBe('#1c1c1e')
    expect(guessHex('Màu lạ')).toBe('#888888')
  })
})
