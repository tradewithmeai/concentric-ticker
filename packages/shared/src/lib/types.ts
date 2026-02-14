/**
 * Shared domain types for the Concentric Crypto Ticker application
 */

// API Response Types
export interface BinanceTickerResponse {
  symbol: string
  priceChange: string
  priceChangePercent: string
  weightedAvgPrice: string
  prevClosePrice: string
  lastPrice: string
  lastQty: string
  bidPrice: string
  askPrice: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  openTime: number
  closeTime: number
  firstId: number
  lastId: number
  count: number
}

export interface BinanceKlineResponse extends Array<string | number> {
  0: number // Open time
  1: string // Open price
  2: string // High price
  3: string // Low price
  4: string // Close price
  5: string // Volume
  6: number // Close time
  7: string // Quote asset volume
  8: number // Number of trades
  9: string // Taker buy base asset volume
  10: string // Taker buy quote asset volume
  11: string // Unused field
}

export type BinanceKline = BinanceKlineResponse

export interface TickerPrice {
  symbol: string
  price: number
}

export interface Alert {
  id: string
  symbol: string
  rule: 'price_cross' | 'percent_change' | 'rvol_exceeds'
  value: number
  note?: string
}

export interface BackoffResult {
  attempt: number
  delayMs: number
}

// Error Types
export interface AuthError {
  message: string
  status?: number
}

// Alert Types
export interface AlertData {
  id: string
  user_id: string
  symbol: string
  alert_type: 'price_cross' | 'percentage_change' | 'volume_spike' | 'trailing_stop'
  target_price: number
  is_above: boolean
  percentage_threshold?: number
  trailing_percentage?: number
  triggered: boolean
  created_at: string
  triggered_at?: string
}

export interface TrailingAlertData {
  id: string
  user_id: string
  symbol: string
  trailing_percentage: number
  initial_price: number
  highest_price: number
  stop_price: number
  is_active: boolean
  created_at: string
  triggered_at?: string
}

// Audio Types
export interface AudioPreferences {
  enabled: boolean
  volume: number
  sound_type: 'beep' | 'chime' | 'alert' | 'notification'
}

// Form Types
export interface SignInFormData {
  email: string
  password: string
}

export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
}

// Technical Analysis Types
export interface TechnicalIndicatorData {
  rsi?: number
  bollinger?: {
    upper: number
    middle: number
    lower: number
  }
  movingAverages?: Array<{
    period: number
    value: number
  }>
}

// Chart Data Types
export interface CryptoDataPoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Utility Types
export type TimeFrame = '5m' | '15m' | '1h' | '4h' | '1d'

export type AlertType = 'price_cross' | 'percentage_change' | 'volume_spike' | 'trailing_stop'

export type SoundType = 'beep' | 'chime' | 'alert' | 'notification'

// Type Guards
export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as AuthError).message === 'string'
  )
}

export function isBinanceTickerResponse(data: unknown): data is BinanceTickerResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'symbol' in data &&
    'lastPrice' in data &&
    typeof (data as BinanceTickerResponse).symbol === 'string' &&
    typeof (data as BinanceTickerResponse).lastPrice === 'string'
  )
}

export function isBinanceKlineResponse(data: unknown): data is BinanceKlineResponse[] {
  return Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) && data[0].length >= 12
}
