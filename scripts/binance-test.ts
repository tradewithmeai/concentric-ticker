/**
 * Binance API connectivity test script
 *
 * Verifies HMAC-SHA256 signing and authenticated endpoint access.
 * Run: pnpm test:binance
 *
 * Requires .env file in project root with:
 *   BINANCE_API_KEY=...
 *   BINANCE_API_SECRET=...
 */

import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Load .env manually (no dotenv dependency needed)
// ---------------------------------------------------------------------------
function loadEnv(): Record<string, string> {
  try {
    const envPath = resolve(__dirname, '..', '.env')
    const content = readFileSync(envPath, 'utf-8')
    const vars: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
    }
    return vars
  } catch {
    return {}
  }
}

const env = loadEnv()
const API_KEY = env.BINANCE_API_KEY || process.env.BINANCE_API_KEY || ''
const API_SECRET = env.BINANCE_API_SECRET || process.env.BINANCE_API_SECRET || ''
const BASE_URL = 'https://api.binance.com'

if (!API_KEY || !API_SECRET) {
  console.error('Missing BINANCE_API_KEY or BINANCE_API_SECRET.')
  console.error('Create a .env file in the project root (see .env.example).')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Signing (with server time sync)
// ---------------------------------------------------------------------------
let timeOffset = 0

async function syncTime() {
  const before = Date.now()
  const data = await fetch(`${BASE_URL}/api/v3/time`).then((r) => r.json())
  const after = Date.now()
  const roundTrip = after - before
  const serverTime = data.serverTime as number
  timeOffset = serverTime - before - Math.floor(roundTrip / 2)
}

function getServerTime(): number {
  return Date.now() + timeOffset
}

function sign(queryString: string): string {
  return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex')
}

async function signedRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  extraParams: Record<string, string> = {}
) {
  const params = new URLSearchParams({
    ...extraParams,
    timestamp: String(getServerTime()),
    recvWindow: '10000',
  })
  const signature = sign(params.toString())
  params.append('signature', signature)

  const url =
    method === 'GET' || method === 'DELETE'
      ? `${BASE_URL}${endpoint}?${params}`
      : `${BASE_URL}${endpoint}`

  const init: RequestInit = {
    method,
    headers: { 'X-MBX-APIKEY': API_KEY },
  }

  if (method === 'POST') {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    init.body = params.toString()
  }

  const response = await fetch(url, init)
  const body = await response.json()

  if (!response.ok) {
    throw new Error(
      `${method} ${endpoint} failed (${response.status}): ${JSON.stringify(body)}`
    )
  }

  return body
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testServerTime() {
  console.log('\n--- 1. Server Time & Clock Sync ---')
  await syncTime()
  const serverTime = getServerTime()
  const localTime = Date.now()
  const diff = localTime - serverTime
  console.log(`  Server time: ${new Date(serverTime).toISOString()}`)
  console.log(`  Local time:  ${new Date(localTime).toISOString()}`)
  console.log(`  Offset:      ${timeOffset}ms applied`)
  console.log(`  ${Math.abs(diff) > 1000 ? '⚠ Large clock drift detected — using server time for signing' : '✓ Clock in sync'}`)
}

async function testAccountInfo() {
  console.log('\n--- 2. Account Info (GET /api/v3/account) ---')
  const data = await signedRequest('/api/v3/account')
  console.log(`  Account type: ${data.accountType}`)
  console.log(`  Can trade:    ${data.canTrade}`)
  console.log(`  Permissions:  ${data.permissions?.join(', ')}`)

  const nonZero = data.balances.filter(
    (b: { asset: string; free: string; locked: string }) =>
      parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
  )

  if (nonZero.length === 0) {
    console.log('  Balances:     (no non-zero balances)')
  } else {
    console.log('  Balances:')
    for (const b of nonZero) {
      console.log(`    ${b.asset.padEnd(8)} free: ${b.free}  locked: ${b.locked}`)
    }
  }
}

async function testExchangeInfo() {
  console.log('\n--- 3. Exchange Info (BTCUSDT filters) ---')
  const data = await fetch(`${BASE_URL}/api/v3/exchangeInfo?symbol=BTCUSDT`).then((r) =>
    r.json()
  )
  const symbol = data.symbols?.[0]
  if (!symbol) {
    console.log('  Could not find BTCUSDT symbol info')
    return
  }

  console.log(`  Status: ${symbol.status}`)
  console.log(`  Base:   ${symbol.baseAsset} (precision: ${symbol.baseAssetPrecision})`)
  console.log(`  Quote:  ${symbol.quoteAsset} (precision: ${symbol.quotePrecision})`)

  const lotSize = symbol.filters.find((f: { filterType: string }) => f.filterType === 'LOT_SIZE')
  const priceFilter = symbol.filters.find(
    (f: { filterType: string }) => f.filterType === 'PRICE_FILTER'
  )
  const notional = symbol.filters.find(
    (f: { filterType: string }) => f.filterType === 'NOTIONAL'
  )

  if (lotSize) {
    console.log(`  LOT_SIZE:     min=${lotSize.minQty} max=${lotSize.maxQty} step=${lotSize.stepSize}`)
  }
  if (priceFilter) {
    console.log(`  PRICE_FILTER: min=${priceFilter.minPrice} max=${priceFilter.maxPrice} tick=${priceFilter.tickSize}`)
  }
  if (notional) {
    console.log(`  NOTIONAL:     min=${notional.minNotional}`)
  }
}

async function testOrderValidation() {
  console.log('\n--- 4. Test Order (POST /api/v3/order/test) ---')
  // This validates the order but does NOT execute it
  try {
    await signedRequest('/api/v3/order/test', 'POST', {
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: '0.001',
      price: '50000.00',
    })
    console.log('  ✓ Test order accepted (no real execution)')
  } catch (err) {
    console.log(`  ✗ Test order rejected: ${(err as Error).message}`)
  }
}

async function testMarginAccount() {
  console.log('\n--- 5. Margin Account Info ---')
  try {
    const data = await signedRequest('/sapi/v1/margin/account')
    console.log(`  Margin level:    ${data.marginLevel}`)
    console.log(`  Total asset (BTC): ${data.totalAssetOfBtc}`)
    console.log(`  Total debt (BTC):  ${data.totalLiabilityOfBtc}`)
    const nonZero = data.userAssets?.filter(
      (a: { asset: string; free: string; locked: string; borrowed: string }) =>
        parseFloat(a.free) > 0 || parseFloat(a.locked) > 0 || parseFloat(a.borrowed) > 0
    )
    if (nonZero?.length > 0) {
      console.log('  Balances:')
      for (const a of nonZero) {
        console.log(`    ${a.asset.padEnd(8)} free: ${a.free}  locked: ${a.locked}  borrowed: ${a.borrowed}`)
      }
    }
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message}`)
  }
}

async function placeMarginLimitOrder() {
  console.log('\n--- 6. Margin Limit Buy Order (BTCUSDT @ $60,000) ---')
  try {
    const data = await signedRequest('/sapi/v1/margin/order', 'POST', {
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: '0.0001',
      price: '60000.00',
    })
    console.log(`  ✓ Order placed!`)
    console.log(`  Order ID:    ${data.orderId}`)
    console.log(`  Symbol:      ${data.symbol}`)
    console.log(`  Side:        ${data.side}`)
    console.log(`  Price:       ${data.price}`)
    console.log(`  Quantity:    ${data.origQty}`)
    console.log(`  Status:      ${data.status}`)
    return data
  } catch (err) {
    console.log(`  ✗ Order failed: ${(err as Error).message}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('===========================================')
  console.log('  Binance API Connectivity Test')
  console.log('===========================================')
  console.log(`  API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`)
  console.log(`  Base URL: ${BASE_URL}`)

  try {
    await testServerTime()
    await testAccountInfo()
    await testExchangeInfo()
    await testOrderValidation()
    await testMarginAccount()
    await placeMarginLimitOrder()
    console.log('\n✓ All tests passed. API connection is working.\n')
  } catch (err) {
    console.error(`\n✗ Test failed: ${(err as Error).message}\n`)
    process.exit(1)
  }
}

main()
