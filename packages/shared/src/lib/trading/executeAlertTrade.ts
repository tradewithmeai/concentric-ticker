import type { LocalAlert } from '../localStore'
import type { OrderResponse, SignerFn } from './types'
import { createTradingClient } from './binanceTrading'
import { getStoredKeys } from './keyStore'
import { addOrderToHistory } from './orderStore'
import { createWebCryptoSigner } from './sign'

export interface TradeResult {
  success: boolean
  order?: OrderResponse
  error?: string
}

/**
 * Execute a trade associated with a triggered alert.
 * Returns null if the alert has no trade configured.
 * Optionally accepts a custom signer (for Electron IPC signing).
 */
export async function executeAlertTrade(
  alert: LocalAlert,
  customSigner?: SignerFn,
): Promise<TradeResult | null> {
  if (!alert.trade_enabled) return null

  const keys = getStoredKeys()
  if (!keys) {
    return { success: false, error: 'No API keys configured' }
  }

  const signer = customSigner ?? createWebCryptoSigner(keys.apiSecret)
  const client = createTradingClient(keys.apiKey, signer)

  try {
    await client.syncTime()

    const accountType = alert.trade_account_type ?? 'SPOT'
    const order = await client.placeLimitOrder({
      symbol: alert.symbol,
      side: alert.trade_side ?? 'BUY',
      quantity: alert.trade_quantity ?? '0',
      price: String(alert.target_price),
      accountType,
      sideEffectType: accountType === 'MARGIN' ? 'MARGIN_BUY' : undefined,
    })

    addOrderToHistory(order, accountType, alert.id)

    return { success: true, order }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
