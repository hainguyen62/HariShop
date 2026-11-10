// Lấy tên, màu, giá, thông số từ các link trong urls.txt, ghi ra data/crawled/products.json (--inspect: chỉ link đầu, in kết quả)

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import { cleanName, guessBrand, mapSpecs, parseColorLines, parseRobots, isAllowedByRobots, isProductUrl } from '../../utils/crawlParse.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const URLS_FILE = path.join(here, 'urls.txt')
const LISTINGS_FILE = path.join(here, 'listings.txt')
const OUT_DIR = path.join(here, '..', '..', 'data', 'crawled')
const OUT_FILE = path.join(OUT_DIR, 'products.json')
const RAW_DIR = path.join(OUT_DIR, 'raw')
const DELAY_MS = Number(process.env.CRAWL_DELAY_MS) || 2500
const UA = 'HariShopThesisBot/1.0 (do an tot nghiep, lien he: chu du an)'
const inspect = process.argv.includes('--inspect')
const discover = process.argv.includes('--discover')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'vi-VN,vi;q=0.9' } })
  if ([403, 429, 503].includes(res.status)) {
    const err = new Error(`Máy chủ trả mã ${res.status}, dừng để không gây tải`)
    err.stop = true
    throw err
  }
  if (!res.ok) throw new Error(`Mã ${res.status}`)
  return res.text()
}

const parsePage = (html, url) => {
  const $ = cheerio.load(html)
  const title = $('h1').first().text() || $('meta[property="og:title"]').attr('content') || ''
  const name = cleanName(title)

  const pairs = []
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('th,td').map((__, c) => $(c).text()).get()
    if (cells.length >= 2) pairs.push([cells[0], cells[1]])
  })
  const { specs, weight } = mapSpecs(pairs)

  const lines = []
  $('li,a,div,span,label').each((_, el) => {
    if ($(el).children().length <= 4) lines.push($(el).text())
  })
  const colors = parseColorLines(lines)

  const prices = colors.map((c) => c.price).filter(Boolean)
  const price = prices.length ? Math.min(...prices) : 0

  const priceLines = [...new Set(lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length <= 100 && /\d{1,3}(?:\.\d{3})+\s*[₫đ]/.test(l)))].slice(0, 25)

  return {
    sourceUrl: url,
    name,
    brand: guessBrand(name),
    price,
    weight,
    specs,
    colors,
    sourceImage: $('meta[property="og:image"]').attr('content') || '',
    specPairs: pairs.length,
    priceLines: inspect ? priceLines : undefined,
  }
}

const run = async () => {
  if (!fs.existsSync(URLS_FILE)) {
    console.error(`Chưa có ${URLS_FILE}. Tạo file này, mỗi dòng một link trang sản phẩm.`)
    process.exit(1)
  }
  const readList = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  let urls = readList(discover ? LISTINGS_FILE : URLS_FILE)
  if (inspect) urls = urls.slice(0, 1)
  if (urls.length === 0) {
    console.error(`${discover ? 'listings.txt' : 'urls.txt'} không có link nào`)
    process.exit(1)
  }

  const origin = new URL(urls[0]).origin
  let robotsText = ''
  try {
    robotsText = await fetchText(`${origin}/robots.txt`)
  } catch (e) {
    console.log(`Không đọc được robots.txt (${e.message}), dừng để an toàn`)
    process.exit(1)
  }
  const rules = parseRobots(robotsText)
  console.log(`robots.txt: ${robotsText.length} ký tự, ${rules.length} quy tắc áp dụng cho mọi bot`)
  if (inspect) console.log(robotsText.split(/\r?\n/).slice(0, 40).join('\n'))

  fs.mkdirSync(RAW_DIR, { recursive: true })

  if (discover) {
    const known = new Set(fs.existsSync(URLS_FILE) ? readList(URLS_FILE) : [])
    const found = []
    for (const listing of urls) {
      const { pathname } = new URL(listing)
      if (!isAllowedByRobots(rules, pathname)) {
        console.log(`Bỏ qua (robots.txt cấm): ${listing}`)
        continue
      }
      const rawFile = path.join(RAW_DIR, `list_${pathname.replace(/[^a-z0-9]+/gi, '_')}.html`)
      try {
        let html
        if (fs.existsSync(rawFile)) {
          html = fs.readFileSync(rawFile, 'utf8')
        } else {
          html = await fetchText(listing)
          fs.writeFileSync(rawFile, html)
          await sleep(DELAY_MS)
        }
        const $ = cheerio.load(html)
        const links = new Set()
        $('a[href]').each((_, a) => {
          const link = isProductUrl($(a).attr('href'), listing)
          if (link) links.add(link)
        })
        const fresh = [...links].filter((l) => !known.has(l) && !found.includes(l))
        found.push(...fresh)
        console.log(`${listing}: ${links.size} link sản phẩm, ${fresh.length} link mới`)
      } catch (e) {
        console.error(`Lỗi ${listing}: ${e.message}`)
        if (e.stop) break
      }
    }
    if (found.length > 0) fs.appendFileSync(URLS_FILE, `${found.join('\n')}\n`)
    console.log(`Đã thêm ${found.length} link vào urls.txt, bạn mở file xem và xóa máy không cần`)
    return
  }

  const existing = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')) : []
  const bySource = new Map(existing.map((p) => [p.sourceUrl, p]))
  let dropped = 0

  for (const url of urls) {
    const { pathname } = new URL(url)
    if (!isAllowedByRobots(rules, pathname)) {
      console.log(`Bỏ qua (robots.txt cấm): ${url}`)
      continue
    }
    const rawFile = path.join(RAW_DIR, `${pathname.replace(/[^a-z0-9]+/gi, '_')}.html`)
    try {
      let html
      if (fs.existsSync(rawFile)) {
        html = fs.readFileSync(rawFile, 'utf8')
      } else {
        html = await fetchText(url)
        fs.writeFileSync(rawFile, html)
        await sleep(DELAY_MS)
      }
      const item = parsePage(html, url)
      if (inspect) {
        console.log(JSON.stringify(item, null, 2))
        console.log(`HTML gốc lưu ở ${rawFile}`)
      }
      if (!inspect && (item.colors.length === 0 || !(item.price > 0))) {
        bySource.delete(url)
        dropped++
        console.log(`Bỏ: ${item.name || url} | không có màu hoặc giá, thường là máy ngừng bán`)
        continue
      }
      bySource.set(url, item)
      console.log(`OK: ${item.name} | ${item.colors.length} màu | ${item.price}`)
    } catch (e) {
      console.error(`Lỗi ${url}: ${e.message}`)
      if (e.stop) break
    }
  }

  if (!inspect) {
    fs.writeFileSync(OUT_FILE, JSON.stringify([...bySource.values()], null, 2))
    console.log(`Đã ghi ${bySource.size} sản phẩm vào ${OUT_FILE}, bỏ ${dropped} máy không có màu hoặc giá`)
  }
}

run()