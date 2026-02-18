export { createTradingClient } from './binanceTrading'
export { executeAlertTrade } from './executeAlertTrade'
export type { TradeResult } from './executeAlertTrade'
export { executeDCATrade } from './executeDCATrade'
export type { DCATradeResult } from './executeDCATrade'
export { createWebCryptoSigner } from './sign'
export { getStoredKeys, saveKeys, clearKeys } from './keyStore'
export type { StoredKeys } from './keyStore'
export {
  getOrderHistory,
  addOrderToHistory,
  updateOrderStatus,
  clearOrderHistory,
} from './orderStore'
export {
  getDCAStrategies,
  saveDCAStrategies,
  createDCAStrategy,
  updateDCAStrategy,
  deleteDCAStrategy,
  computeNextExecution,
} from './dcaStore'
export type { DCAStrategy } from './dcaStore'
export type {
  OrderSide,
  OrderType,
  TimeInForce,
  OrderStatus,
  AccountType,
  SideEffectType,
  LimitOrderParams,
  MarketOrderParams,
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
