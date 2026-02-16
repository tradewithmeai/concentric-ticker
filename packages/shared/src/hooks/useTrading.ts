import { useState, useCallback, useRef } from 'react'
import { createTradingClient } from '../lib/trading/binanceTrading'
import { getStoredKeys } from '../lib/trading/keyStore'
import { createWebCryptoSigner } from '../lib/trading/sign'
import type {
  SignerFn,
  LimitOrderParams,
  OrderResponse,
  OpenOrder,
  BalanceEntry,
  MarginAccountInfo,
  MaxBorrowable,
  SymbolFilters,
} from '../lib/trading/types'

type TradingClient = ReturnType<typeof createTradingClient>

interface UseTradingOptions {
  customSigner?: SignerFn
}

export function useTrading(options?: UseTradingOptions) {
  const [isConnected, setIsConnected] = useState(() => !!getStoredKeys())
  const [isLoading, setIsLoading] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const clientRef = useRef<TradingClient | null>(null)
  const timeSyncedRef = useRef(false)

  const getClient = useCallback((): TradingClient | null => {
    if (clientRef.current) return clientRef.current

    const keys = getStoredKeys()
    if (!keys) {
      setIsConnected(false)
      return null
    }

    const signer = options?.customSigner ?? createWebCryptoSigner(keys.apiSecret)
    clientRef.current = createTradingClient(keys.apiKey, signer)
    setIsConnected(true)
    return clientRef.current
  }, [options?.customSigner])

  const ensureTimeSync = useCallback(async (client: TradingClient) => {
    if (!timeSyncedRef.current) {
      await client.syncTime()
      timeSyncedRef.current = true
    }
  }, [])

  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setConnectionError(null)

    try {
      const client = getClient()
      if (!client) {
        setConnectionError('No API keys configured')
        return false
      }

      await client.syncTime()
      timeSyncedRef.current = true
      await client.getAccountBalances()
      setIsConnected(true)
      return true
    } catch (err) {
      const msg = (err as Error).message
      setConnectionError(msg)
      setIsConnected(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [getClient])

  const refreshConnection = useCallback(() => {
    clientRef.current = null
    timeSyncedRef.current = false
    setIsConnected(!!getStoredKeys())
    setConnectionError(null)
  }, [])

  const placeLimitOrder = useCallback(
    async (params: LimitOrderParams): Promise<OrderResponse> => {
      const client = getClient()
      if (!client) throw new Error('Not connected')
      await ensureTimeSync(client)
      return client.placeLimitOrder(params)
    },
    [getClient, ensureTimeSync],
  )

  const getOpenOrders = useCallback(
    async (symbol?: string): Promise<OpenOrder[]> => {
      const client = getClient()
      if (!client) throw new Error('Not connected')
      await ensureTimeSync(client)
      return client.getOpenOrders(symbol)
    },
    [getClient, ensureTimeSync],
  )

  const getMarginOpenOrders = useCallback(
    async (symbol?: string): Promise<OpenOrder[]> => {
      const client = getClient()
      if (!client) throw new Error('Not connected')
      await ensureTimeSync(client)
      return client.getMarginOpenOrders(symbol)
    },
    [getClient, ensureTimeSync],
  )

  const cancelOrder = useCallback(
    async (symbol: string, orderId: number): Promise<void> => {
      const client = getClient()
      if (!client) throw new Error('Not connected')
      await ensureTimeSync(client)
      return client.cancelOrder(symbol, orderId)
    },
    [getClient, ensureTimeSync],
  )

  const cancelMarginOrder = useCallback(
    async (symbol: string, orderId: number): Promise<void> => {
      const client = getClient()
      if (!client) throw new Error('Not connected')
      await ensureTimeSync(client)
      return client.cancelMarginOrder(symbol, orderId)
    },
    [getClient, ensureTimeSync],
  )

  const getAccountBalances = useCallback(async (): Promise<BalanceEntry[]> => {
    const client = getClient()
    if (!client) throw new Error('Not connected')
    await ensureTimeSync(client)
    return client.getAccountBalances()
  }, [getClient, ensureTimeSync])

  const getMarginAccount = useCallback(async (): Promise<MarginAccountInfo> => {
    const client = getClient()
    if (!client) throw new Error('Not connected')
    await ensureTimeSync(client)
    return client.getMarginAccount()
  }, [getClient, ensureTimeSync])

  const getMaxBorrowable = useCallback(
    async (asset: string): Promise<MaxBorrowable> => {
      const client = getClient()
      if (!client) throw new Error('Not connected')
      await ensureTimeSync(client)
      return client.getMaxBorrowable(asset)
    },
    [getClient, ensureTimeSync],
  )

  const getSymbolFilters = useCallback(
    async (symbol: string): Promise<SymbolFilters> => {
      const client = getClient()
      if (!client) throw new Error('Not connected')
      return client.getSymbolFilters(symbol)
    },
    [getClient],
  )

  return {
    isConnected,
    isLoading,
    connectionError,
    testConnection,
    refreshConnection,
    placeLimitOrder,
    getOpenOrders,
    getMarginOpenOrders,
    cancelOrder,
    cancelMarginOrder,
    getAccountBalances,
    getMarginAccount,
    getMaxBorrowable,
    getSymbolFilters,
  }
}
