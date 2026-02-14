/**
 * Binance API data layer with timeout, exponential backoff, and error handling
 * Preserves existing function signatures and return shapes
 */

import { BINANCE_BASE } from '../env'
import { BinanceTickerResponse, BinanceKlineResponse } from '../types'
import { log } from '../logger'

class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public url: string,
    public attempt: number,
    public status?: number,
    public retryAfterSec?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  timeout: number
  jitterPercent: number
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 300,
  timeout: 6000,
  jitterPercent: 30,
}

function addJitter(delay: number, jitterPercent: number): number {
  const jitter = delay * (jitterPercent / 100)
  const randomFactor = Math.random() * 2 - 1 // -1 to 1
  return Math.round(delay + jitter * randomFactor)
}

function isRetryableError(error: unknown, status?: number): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true
    if (error.name === 'TypeError') return true // Network errors
  }

  if (status !== undefined) {
    if (status === 429) return true // Rate limiting
    if (status >= 500 && status < 600) return true // Server errors
  }

  return false
}

async function fetchJsonWithRetry(
  input: string,
  init?: RequestInit,
  config: RetryConfig = DEFAULT_CONFIG
): Promise<unknown> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let retryAfterSec: number | undefined

        // Handle 429 Rate Limiting
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('Retry-After')
          if (retryAfterHeader) {
            const parsed = parseInt(retryAfterHeader, 10)
            if (!isNaN(parsed)) {
              retryAfterSec = parsed
            }
          }

          const error = new ApiError(
            retryAfterSec
              ? `Rate limit: cooling down for ~${retryAfterSec}s`
              : 'Rate limit: cooling down. Please try again shortly.',
            'RATE_LIMITED',
            input,
            attempt,
            response.status,
            retryAfterSec
          )

          throw error
        }

        const error = new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          input,
          attempt,
          response.status
        )

        if (!isRetryableError(error, response.status)) {
          throw error
        }

        lastError = error

        if (import.meta.env.DEV) {
          log(`API retry ${attempt}/${config.maxAttempts}: ${response.status} ${input}`)
        }
      } else {
        return await response.json()
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ApiError) {
        lastError = error
      } else if (error instanceof Error && error.name === 'AbortError') {
        lastError = new ApiError('Request timeout', 'ABORT_TIMEOUT', input, attempt)
      } else if (error instanceof Error) {
        lastError = new ApiError(error.message, 'NETWORK_ERROR', input, attempt)
      } else {
        lastError = new ApiError('Unknown error', 'NETWORK_ERROR', input, attempt)
      }

      if (!isRetryableError(error)) {
        throw lastError
      }

      if (import.meta.env.DEV) {
        log(`API retry ${attempt}/${config.maxAttempts}: ${lastError.message} ${input}`)
      }
    }

    // Wait before retry (except on last attempt)
    if (attempt < config.maxAttempts) {
      const delay = config.baseDelay * Math.pow(2, attempt - 1)
      const jitteredDelay = addJitter(delay, config.jitterPercent)
      await new Promise((resolve) => setTimeout(resolve, jitteredDelay))
    }
  }

  // All retries exhausted
  const finalError = new ApiError(
    `Max retries (${config.maxAttempts}) exhausted: ${lastError?.message || 'Unknown error'}`,
    'RETRY_EXHAUSTED',
    input,
    config.maxAttempts
  )
  throw finalError
}

// Public API functions that maintain existing signatures and shapes
export async function fetchTickerData(symbol: string): Promise<BinanceTickerResponse> {
  const url = `${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`
  const data = await fetchJsonWithRetry(url)

  // Ensure numeric fields are properly typed
  return {
    ...data,
    priceChange: String(data.priceChange),
    priceChangePercent: String(data.priceChangePercent),
    lastPrice: String(data.lastPrice),
    openTime: Number(data.openTime),
    closeTime: Number(data.closeTime),
    firstId: Number(data.firstId),
    lastId: Number(data.lastId),
    count: Number(data.count),
  }
}

export async function fetchKlineData(
  symbol: string,
  interval: string,
  limit: number
): Promise<BinanceKlineResponse[]> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const data = await fetchJsonWithRetry(url)

  if (!Array.isArray(data)) {
    throw new ApiError('Invalid kline response format', 'HTTP_ERROR', url, 1)
  }

  return data.map((kline: unknown[]) => {
    if (!Array.isArray(kline) || kline.length < 12) {
      throw new ApiError('Invalid kline format', 'HTTP_ERROR', url, 1)
    }

    return [
      Number(kline[0]), // Open time
      String(kline[1]), // Open price
      String(kline[2]), // High price
      String(kline[3]), // Low price
      String(kline[4]), // Close price
      String(kline[5]), // Volume
      Number(kline[6]), // Close time
      String(kline[7]), // Quote asset volume
      Number(kline[8]), // Number of trades
      String(kline[9]), // Taker buy base asset volume
      String(kline[10]), // Taker buy quote asset volume
      String(kline[11]), // Unused field
    ] as BinanceKlineResponse
  })
}

// Export the ApiError class for external error handling
export { ApiError }
