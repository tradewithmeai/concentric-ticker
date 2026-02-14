/**
 * Environment variable validation and exports
 * Validates VITE_* variables at startup for fail-fast behavior
 */

const RAW = import.meta.env.VITE_BINANCE_BASE

function validateBinanceBase(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return ''
  }

  return trimmed
}

function getBinanceBase(): string {
  const validated = validateBinanceBase(RAW)
  const defaultUrl = 'https://api.binance.com'

  if (!validated) {
    return defaultUrl
  }

  return validated
}

export const BINANCE_BASE = getBinanceBase()
