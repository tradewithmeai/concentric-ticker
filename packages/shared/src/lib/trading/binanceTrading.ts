import { BINANCE_BASE } from '../env'
import type {
  SignerFn,
  LimitOrderParams,
  OrderResponse,
  OpenOrder,
  BalanceEntry,
  MarginAccountInfo,
  MarginBalanceEntry,
  MaxBorrowable,
  SymbolFilters,
} from './types'

interface TradingClient {
  syncTime(): Promise<void>
  getServerTime(): number
  getAccountBalances(): Promise<BalanceEntry[]>
  getMarginAccount(): Promise<MarginAccountInfo>
  getMaxBorrowable(asset: string): Promise<MaxBorrowable>
  getSymbolFilters(symbol: string): Promise<SymbolFilters>
  testOrder(params: LimitOrderParams): Promise<void>
  placeLimitOrder(params: LimitOrderParams): Promise<OrderResponse>
  getOpenOrders(symbol?: string): Promise<OpenOrder[]>
  getMarginOpenOrders(symbol?: string): Promise<OpenOrder[]>
  cancelOrder(symbol: string, orderId: number): Promise<void>
  cancelMarginOrder(symbol: string, orderId: number): Promise<void>
}

export function createTradingClient(
  apiKey: string,
  signer: SignerFn,
): TradingClient {
  let timeOffset = 0

  async function syncTime(): Promise<void> {
    const before = Date.now()
    const res = await fetch(`${BINANCE_BASE}/api/v3/time`)
    const data = await res.json()
    const after = Date.now()
    const roundTrip = after - before
    timeOffset = (data.serverTime as number) - before - Math.floor(roundTrip / 2)
  }

  function getServerTime(): number {
    return Date.now() + timeOffset
  }

  async function signedRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    extraParams: Record<string, string> = {},
  ): Promise<any> {
    const params = new URLSearchParams({
      ...extraParams,
      timestamp: String(getServerTime()),
      recvWindow: '10000',
    })

    const signature = await signer(params.toString())
    params.append('signature', signature)

    const url =
      method === 'GET' || method === 'DELETE'
        ? `${BINANCE_BASE}${endpoint}?${params}`
        : `${BINANCE_BASE}${endpoint}`

    const headers: Record<string, string> = { 'X-MBX-APIKEY': apiKey }
    const init: RequestInit = { method, headers }

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      init.body = params.toString()
    }

    const response = await fetch(url, init)
    const body = await response.json()

    if (!response.ok) {
      throw new Error(
        `Binance ${method} ${endpoint} (${response.status}): ${body.msg || JSON.stringify(body)}`,
      )
    }

    return body
  }

  async function getAccountBalances(): Promise<BalanceEntry[]> {
    const data = await signedRequest('/api/v3/account')
    return (data.balances as BalanceEntry[]).filter(
      b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
    )
  }

  async function getMarginAccount(): Promise<MarginAccountInfo> {
    const data = await signedRequest('/sapi/v1/margin/account')
    const balances = (data.userAssets as MarginBalanceEntry[]).filter(
      a =>
        parseFloat(a.free) > 0 ||
        parseFloat(a.locked) > 0 ||
        parseFloat(a.borrowed) > 0,
    )
    return {
      marginLevel: data.marginLevel,
      totalAssetOfBtc: data.totalAssetOfBtc,
      totalLiabilityOfBtc: data.totalLiabilityOfBtc,
      balances,
    }
  }

  async function getMaxBorrowable(asset: string): Promise<MaxBorrowable> {
    return signedRequest('/sapi/v1/margin/maxBorrowable', 'GET', { asset })
  }

  async function getSymbolFilters(symbol: string): Promise<SymbolFilters> {
    const data = await fetch(`${BINANCE_BASE}/api/v3/exchangeInfo?symbol=${symbol}`).then(r => r.json())
    const sym = data.symbols?.[0]
    if (!sym) throw new Error(`Symbol ${symbol} not found`)

    const lotSize = sym.filters.find((f: any) => f.filterType === 'LOT_SIZE')
    const priceFilter = sym.filters.find((f: any) => f.filterType === 'PRICE_FILTER')
    const notional = sym.filters.find((f: any) => f.filterType === 'NOTIONAL')

    return {
      minQty: lotSize?.minQty ?? '0',
      maxQty: lotSize?.maxQty ?? '0',
      stepSize: lotSize?.stepSize ?? '0',
      minPrice: priceFilter?.minPrice ?? '0',
      maxPrice: priceFilter?.maxPrice ?? '0',
      tickSize: priceFilter?.tickSize ?? '0',
      minNotional: notional?.minNotional ?? '0',
    }
  }

  async function testOrder(params: LimitOrderParams): Promise<void> {
    await signedRequest('/api/v3/order/test', 'POST', {
      symbol: params.symbol,
      side: params.side,
      type: 'LIMIT',
      timeInForce: params.timeInForce ?? 'GTC',
      quantity: params.quantity,
      price: params.price,
    })
  }

  async function placeLimitOrder(params: LimitOrderParams): Promise<OrderResponse> {
    const isMargin = params.accountType === 'MARGIN'
    const endpoint = isMargin ? '/sapi/v1/margin/order' : '/api/v3/order'

    const reqParams: Record<string, string> = {
      symbol: params.symbol,
      side: params.side,
      type: 'LIMIT',
      timeInForce: params.timeInForce ?? 'GTC',
      quantity: params.quantity,
      price: params.price,
    }

    if (isMargin && params.sideEffectType) {
      reqParams.sideEffectType = params.sideEffectType
    }

    return signedRequest(endpoint, 'POST', reqParams)
  }

  async function getOpenOrders(symbol?: string): Promise<OpenOrder[]> {
    const params: Record<string, string> = {}
    if (symbol) params.symbol = symbol
    const orders = await signedRequest('/api/v3/openOrders', 'GET', params)
    return orders.map((o: any) => ({ ...o, isMargin: false }))
  }

  async function getMarginOpenOrders(symbol?: string): Promise<OpenOrder[]> {
    const params: Record<string, string> = {}
    if (symbol) params.symbol = symbol
    const orders = await signedRequest('/sapi/v1/margin/openOrders', 'GET', params)
    return orders.map((o: any) => ({ ...o, isMargin: true }))
  }

  async function cancelOrder(symbol: string, orderId: number): Promise<void> {
    await signedRequest('/api/v3/order', 'DELETE', {
      symbol,
      orderId: String(orderId),
    })
  }

  async function cancelMarginOrder(symbol: string, orderId: number): Promise<void> {
    await signedRequest('/sapi/v1/margin/order', 'DELETE', {
      symbol,
      orderId: String(orderId),
    })
  }

  return {
    syncTime,
    getServerTime,
    getAccountBalances,
    getMarginAccount,
    getMaxBorrowable,
    getSymbolFilters,
    testOrder,
    placeLimitOrder,
    getOpenOrders,
    getMarginOpenOrders,
    cancelOrder,
    cancelMarginOrder,
  }
}
