export { createTradingClient } from './binanceTrading'
export { executeAlertTrade } from './executeAlertTrade'
export type { TradeResult } from './executeAlertTrade'
export { createWebCryptoSigner } from './sign'
export { getStoredKeys, saveKeys, clearKeys } from './keyStore'
export type { StoredKeys } from './keyStore'
export {
  getOrderHistory,
  addOrderToHistory,
  updateOrderStatus,
  clearOrderHistory,
} from './orderStore'
export type {
  OrderSide,
  OrderType,
  TimeInForce,
  OrderStatus,
  AccountType,
  SideEffectType,
  LimitOrderParams,
  OrderResponse,
  OpenOrder,
  BalanceEntry,
  MarginBalanceEntry,
  MarginAccountInfo,
  MaxBorrowable,
  SymbolFilters,
  TradeAlertConfig,
  StoredOrder,
  SignerFn,
} from './types'
