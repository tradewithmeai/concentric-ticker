import type { DCAStrategy } from './dcaStore'
import type { OrderResponse, SignerFn } from './types'
import { createTradingClient } from './binanceTrading'
import { getStoredKeys } from './keyStore'
import { addOrderToHistory } from './orderStore'
import { createWebCryptoSigner } from './sign'

export interface DCATradeResult {
  success: boolean
  order?: OrderResponse
  error?: string
}

/**
 * Execute a single DCA market order for a strategy.
 */
export async function executeDCATrade(
  strategy: DCAStrategy,
  customSigner?: SignerFn,
): Promise<DCATradeResult> {
  const keys = getStoredKeys()
  if (!keys) {
    return { success: false, error: 'No API keys configured' }
  }

  const signer = customSigner ?? createWebCryptoSigner(keys.apiSecret)
  const client = createTradingClient(keys.apiKey, signer)

  try {
    await client.syncTime()

    const isMargin = strategy.accountType === 'MARGIN'

    const order = await client.placeMarketOrder({
      symbol: strategy.symbol,
      side: strategy.side,
      quoteOrderQty: strategy.side === 'BUY' ? strategy.quoteAmount : undefined,
      quantity: strategy.side === 'SELL' ? strategy.quoteAmount : undefined,
      accountType: strategy.accountType,
      sideEffectType: isMargin
        ? strategy.side === 'BUY' ? 'MARGIN_BUY' : 'AUTO_REPAY'
        : undefined,
    })

    addOrderToHistory(order, strategy.accountType, `dca-${strategy.id}`)

    return { success: true, order }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
