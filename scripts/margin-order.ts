import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(): Record<string, string> {
  try {
    const content = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8')
    const vars: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      vars[t.slice(0, eq)] = t.slice(eq + 1)
    }
    return vars
  } catch { return {} }
}

const env = loadEnv()
const API_KEY = env.BINANCE_API_KEY || ''
const API_SECRET = env.BINANCE_API_SECRET || ''
const BASE_URL = 'https://api.binance.com'

let timeOffset = 0

async function syncTime() {
  const before = Date.now()
  const data = await fetch(`${BASE_URL}/api/v3/time`).then(r => r.json())
  const after = Date.now()
  timeOffset = (data.serverTime as number) - before - Math.floor((after - before) / 2)
}

function getServerTime() { return Date.now() + timeOffset }

function sign(qs: string) {
  return crypto.createHmac('sha256', API_SECRET).update(qs).digest('hex')
}

async function signedRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  extra: Record<string, string> = {}
) {
  const params = new URLSearchParams({
    ...extra,
    timestamp: String(getServerTime()),
    recvWindow: '10000',
  })
  params.append('signature', sign(params.toString()))

  const url = method === 'GET'
    ? `${BASE_URL}${endpoint}?${params}`
    : `${BASE_URL}${endpoint}`

  const init: RequestInit = {
    method,
    headers: { 'X-MBX-APIKEY': API_KEY },
  }

  if (method === 'POST') {
    init.headers = { ...init.headers, 'Content-Type': 'application/x-www-form-urlencoded' }
    init.body = params.toString()
  }

  const res = await fetch(url, init)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} (${res.status}): ${JSON.stringify(body)}`)
  }
  return body
}

async function main() {
  await syncTime()
  console.log('Time synced (offset:', timeOffset, 'ms)\n')

  // 1. Check margin account
  console.log('--- Margin Account ---')
  const margin = await signedRequest('/sapi/v1/margin/account')
  const usdt = margin.userAssets?.find((a: any) => a.asset === 'USDT')
  console.log('USDT:', JSON.stringify(usdt, null, 2))
  console.log('Margin level:', margin.marginLevel)

  // 2. Check max borrowable
  console.log('\n--- Max Borrowable ---')
  const maxBorrow = await signedRequest('/sapi/v1/margin/maxBorrowable', 'GET', { asset: 'USDT' })
  console.log('Max borrowable USDT:', JSON.stringify(maxBorrow, null, 2))

  // 3. Calculate max BTC at $62,100
  const freeUsdt = parseFloat(usdt?.free || '0')
  const borrowable = parseFloat(maxBorrow?.amount || '0')
  const totalUsdt = freeUsdt + borrowable
  const price = 62100
  const rawQty = totalUsdt / price
  // Round down to 5 decimal places (BTC step size is 0.00001)
  const quantity = Math.floor(rawQty * 100000) / 100000

  console.log(`\n--- Order Calculation ---`)
  console.log(`Free USDT:      ${freeUsdt}`)
  console.log(`Borrowable:     ${borrowable}`)
  console.log(`Total USDT:     ${totalUsdt}`)
  console.log(`Price:          $${price}`)
  console.log(`Max BTC qty:    ${quantity}`)
  console.log(`Notional value: $${(quantity * price).toFixed(2)}`)

  // Check minimum notional ($5)
  if (quantity * price < 5) {
    console.log('\n✗ Insufficient balance — notional value below $5 minimum')
    return
  }

  // 4. Place the margin limit buy order
  console.log(`\n--- Placing Margin Limit Buy ---`)
  console.log(`  BUY ${quantity} BTC @ $${price} (GTC)`)
  const order = await signedRequest('/sapi/v1/margin/order', 'POST', {
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'LIMIT',
    timeInForce: 'GTC',
    quantity: String(quantity),
    price: String(price) + '.00',
    sideEffectType: 'MARGIN_BUY',
  })

  console.log(`\n  ✓ Order placed!`)
  console.log(`  Order ID:  ${order.orderId}`)
  console.log(`  Symbol:    ${order.symbol}`)
  console.log(`  Side:      ${order.side}`)
  console.log(`  Price:     ${order.price}`)
  console.log(`  Quantity:  ${order.origQty}`)
  console.log(`  Status:    ${order.status}`)
}

main().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})
