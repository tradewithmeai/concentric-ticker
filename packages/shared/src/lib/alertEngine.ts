/**
 * Pure alert engine functions for unit testing
 * These wrappers expose existing alert logic in testable form
 */

import { Alert, AlertData } from './types'

/**
 * Generate stable hash for alert identification
 */
export function hashAlert(input: Alert): string {
  const content = `${input.id}-${input.symbol}-${input.rule}-${input.value}`
  return btoa(content).replace(/[+/=]/g, '').toLowerCase()
}

/**
 * Evaluate if price has crossed a threshold
 */
export function evaluatePriceCross(
  prev: number,
  curr: number,
  target: number,
  dir: 'up' | 'down'
): boolean {
  if (prev === curr) return false

  if (dir === 'up') {
    return prev <= target && curr > target
  } else {
    return prev >= target && curr < target
  }
}

/**
 * Evaluate if percentage change meets threshold
 */
export function evaluatePercentChange(
  ref: number,
  curr: number,
  pct: number,
  mode: 'up' | 'down'
): boolean {
  if (ref <= 0) return false

  const change = ((curr - ref) / ref) * 100

  if (mode === 'up') {
    return change >= pct
  } else {
    return change <= -pct
  }
}

/**
 * Evaluate if relative volume exceeds threshold
 */
export function evaluateRelativeVolume(rvol: number, threshold: number): boolean {
  return rvol >= threshold
}
