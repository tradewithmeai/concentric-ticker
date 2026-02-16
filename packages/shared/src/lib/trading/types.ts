export type OrderSide = 'BUY' | 'SELL'

export type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'

export type TimeInForce = 'GTC' | 'IOC' | 'FOK'

export type OrderStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'PENDING_CANCEL'
  | 'REJECTED'
  | 'EXPIRED'

export type AccountType = 'SPOT' | 'MARGIN'

export type SideEffectType = 'NO_SIDE_EFFECT' | 'MARGIN_BUY' | 'AUTO_REPAY'

export interface LimitOrderParams {
  symbol: string
  side: OrderSide
  quantity: string
  price: string
  timeInForce?: TimeInForce
  accountType?: AccountType
  sideEffectType?: SideEffectType
}

export interface OrderResponse {
  orderId: number
  symbol: string
  side: OrderSide
  type: OrderType
  price: string
  origQty: string
  executedQty: string
  status: OrderStatus
  timeInForce: TimeInForce
  transactTime?: number
}

export interface OpenOrder {
  orderId: number
  symbol: string
  side: OrderSide
  type: OrderType
  price: string
  origQty: string
  executedQty: string
  status: OrderStatus
  time: number
  isMargin?: boolean
}

export interface BalanceEntry {
  asset: string
  free: string
  locked: string
}

export interface MarginBalanceEntry extends BalanceEntry {
  borrowed: string
  interest: string
  netAsset: string
}

export interface MarginAccountInfo {
  marginLevel: string
  totalAssetOfBtc: string
  totalLiabilityOfBtc: string
  balances: MarginBalanceEntry[]
}

export interface MaxBorrowable {
  amount: string
  borrowLimit: string
}

export interface SymbolFilters {
  minQty: string
  maxQty: string
  stepSize: string
  minPrice: string
  maxPrice: string
  tickSize: string
  minNotional: string
}

export interface TradeAlertConfig {
  trade_enabled: boolean
  trade_side: OrderSide
  trade_quantity: string
  trade_account_type: AccountType
}

export interface StoredOrder {
  id: string
  orderId: number
  symbol: string
  side: OrderSide
  price: string
  quantity: string
  status: OrderStatus
  accountType: AccountType
  alertId?: string
  createdAt: string
}

export type SignerFn = (queryString: string) => Promise<string>
