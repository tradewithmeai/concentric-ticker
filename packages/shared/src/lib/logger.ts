/**
 * Development-only logger that no-ops in production
 */
import { isDebug } from './debug'

export const log = (...args: unknown[]) => {
  if (isDebug()) console.log(...args)
}

export const warn = (...args: unknown[]) => {
  if (isDebug()) console.warn(...args)
}

export const error = (...args: unknown[]) => {
  if (isDebug()) console.error(...args)
}
