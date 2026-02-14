/**
 * Pure backoff computation functions for unit testing
 * Mirrors the retry/backoff logic from binance.ts
 */

/**
 * Compute backoff delay range for a given attempt
 * Mirrors: config.baseDelay * Math.pow(2, attempt - 1) with jitter
 */
export function computeBackoff(
  attempt: number,
  base = 300,
  jitter = 0.3
): { min: number; max: number } {
  const delay = base * Math.pow(2, attempt - 1)
  const jitterAmount = delay * jitter

  return {
    min: Math.round(delay - jitterAmount),
    max: Math.round(delay + jitterAmount),
  }
}

/**
 * Add jitter to a delay value (mirrors addJitter from binance.ts)
 */
export function addJitter(delay: number, jitterPercent: number): number {
  const jitter = delay * (jitterPercent / 100)
  const randomFactor = Math.random() * 2 - 1 // -1 to 1
  return Math.round(delay + jitter * randomFactor)
}

/**
 * Check if an error/status code is retryable
 */
export function isRetryableError(status?: number): boolean {
  if (status !== undefined) {
    if (status === 429) return true // Rate limiting
    if (status >= 500 && status < 600) return true // Server errors
  }
  return false
}
