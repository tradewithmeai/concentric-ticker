/**
 * Minimal app error store using useSyncExternalStore
 * No external dependencies, lightweight evented store
 */

import { useSyncExternalStore } from 'react'

interface AppState {
  status: 'ok' | 'error'
  message?: string
  code?: string | number
  retryAfterSec?: number
  retryToken: number
  inFlight: boolean
  errorCount?: number // Dev-only error counter
}

interface ErrorInfo {
  message: string
  code?: string | number
  retryAfterSec?: number
}

// Initial state
let state: AppState = {
  status: 'ok',
  retryToken: 0,
  inFlight: false,
  ...(import.meta.env.DEV && { errorCount: 0 }), // Dev-only error counter
}

// Subscribers for state changes
const subscribers = new Set<() => void>()

// Notify all subscribers of state change
function notifySubscribers() {
  subscribers.forEach((callback) => callback())
}

// Subscribe to state changes
function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

// Get current state snapshot
function getSnapshot(): AppState {
  return state
}

// Actions
export function setError(errorInfo: ErrorInfo): void {
  state = {
    status: 'error',
    message: errorInfo.message,
    code: errorInfo.code,
    retryAfterSec: errorInfo.retryAfterSec,
    retryToken: state.retryToken,
    inFlight: false,
    ...(import.meta.env.DEV && { errorCount: (state.errorCount || 0) + 1 }), // Increment dev error counter
  }
  notifySubscribers()
}

export function clearError(): void {
  state = {
    status: 'ok',
    retryToken: state.retryToken,
    inFlight: false,
    ...(import.meta.env.DEV && { errorCount: state.errorCount }), // Preserve error count in dev
  }
  notifySubscribers()
}

export function requestRetry(): void {
  if (state.inFlight) return // Ignore retry if already in-flight

  state = {
    ...state,
    retryToken: state.retryToken + 1,
    inFlight: true,
    ...(import.meta.env.DEV && { errorCount: state.errorCount }), // Preserve error count in dev
  }
  notifySubscribers()
}

export function setInFlight(inFlight: boolean): void {
  state = {
    ...state,
    inFlight,
    ...(import.meta.env.DEV && { errorCount: state.errorCount }), // Preserve error count in dev
  }
  notifySubscribers()
}

// Hooks
export function useAppStatus(): 'ok' | 'error' {
  const appState = useSyncExternalStore(subscribe, getSnapshot)
  return appState.status
}

export function useErrorInfo(): {
  message?: string
  code?: string | number
  retryAfterSec?: number
} | null {
  const appState = useSyncExternalStore(subscribe, getSnapshot)
  if (appState.status === 'error') {
    return {
      message: appState.message,
      code: appState.code,
      retryAfterSec: appState.retryAfterSec,
    }
  }
  return null
}

export function useRetryToken(): number {
  const appState = useSyncExternalStore(subscribe, getSnapshot)
  return appState.retryToken
}

export function useInFlight(): boolean {
  const appState = useSyncExternalStore(subscribe, getSnapshot)
  return appState.inFlight
}

// Dev-only hook for error count
export function useErrorCount(): number | undefined {
  const appState = useSyncExternalStore(subscribe, getSnapshot)
  return import.meta.env.DEV ? appState.errorCount : undefined
}
