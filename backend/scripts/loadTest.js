import { spawnSync } from 'child_process'

const base = process.env.LOAD_TEST_URL || 'http://localhost:5000'
const connections = process.env.LOAD_TEST_CONNECTIONS || '100'
const seconds = process.env.LOAD_TEST_SECONDS || '10'
const paths = ['/api/products', '/api/products/top', '/api/products?keyword=iphone']

for (const path of paths) {
  console.log(`\n=== ${base}${path} (${connections} kết nối, ${seconds} giây) ===`)
  const result = spawnSync(
    'npx',
    ['--yes', 'autocannon', '-c', connections, '-d', seconds, `${base}${path}`],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  )
  if (result.status !== 0) process.exit(result.status || 1)
}
