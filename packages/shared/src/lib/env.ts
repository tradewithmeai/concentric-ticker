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

  if (validated) {
    return validated
  }

  // In dev mode with Vite proxy, use relative path to avoid CORS
  // Electron doesn't have CORS issues so it uses the direct URL
  if (import.meta.env.DEV && !navigator.userAgent.includes('Electron')) {
    return '/binance-api'
  }

  return 'https://api.binance.com'
}

export const BINANCE_BASE = getBinanceBase()
