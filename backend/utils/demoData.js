// Sinh dữ liệu mẫu để demo dự báo: nhu cầu có xu hướng và nhiễu, giá nhập trôi theo thời gian.
// Dùng bộ sinh số giả ngẫu nhiên có seed nên kết quả lặp lại được.

export const makeRng = (seed = 1) => {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 24 * 60 * 60 * 1000

export const generateDemoPlan = (products, { weeks = 16, now = new Date(), seed = 7 } = {}) => {
  const rng = makeRng(seed)
  const orders = []
  const imports = []

  products.forEach((p, idx) => {
    const base = 1 + Math.floor(rng() * 5) // máy/tuần
    const growth = (rng() - 0.35) * 0.25 // tăng hoặc giảm theo tuần
    const basePrice = Math.max(Number(p.price) * 0.82, 1000000)
    const priceDrift = (rng() - 0.45) * 0.015 // trôi giá nhập mỗi tuần

    for (let w = 0; w < weeks; w += 1) {
      const weeksAgo = weeks - 1 - w
      const expected = Math.max(0, base * (1 + growth * w * 0.3) + (rng() - 0.5) * 2)
      const units = Math.round(expected)
      for (let u = 0; u < units; u += 1) {
        const date = new Date(now.getTime() - weeksAgo * 7 * DAY - Math.floor(rng() * 6.5 * DAY))
        orders.push({ productIdx: idx, date, qty: 1 })
      }
      if (w % 4 === 0) {
        const cost = Math.round((basePrice * (1 + priceDrift * w)) / 1000) * 1000
        const date = new Date(now.getTime() - weeksAgo * 7 * DAY - 3 * DAY)
        imports.push({ productIdx: idx, date, qty: Math.max(5, Math.round(base * 4)), cost })
      }
    }
  })

  return { orders, imports }
}
