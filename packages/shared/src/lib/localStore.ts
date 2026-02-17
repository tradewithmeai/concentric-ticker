/**
 * Local storage adapter for alerts and preferences
 * Replaces Supabase for the desktop version
 */

import { AlertType } from './types'
import type { OrderSide, AccountType } from './trading/types'

const ALERTS_KEY = 'crypto-ticker-alerts'
const AUDIO_PREFS_KEY = 'crypto-ticker-audio-prefs'

export interface LocalAlert {
  id: string
  symbol: string
  target_price: number
  direction: 'above' | 'below'
  alert_type: AlertType
  trailing_percent?: number
  trailing_high?: number
  status: 'active' | 'triggered' | 'cancelled'
  created_at: string
  triggered_at?: string
  // Optional trade fields (backward-compatible)
  trade_enabled?: boolean
  trade_side?: OrderSide
  trade_quantity?: string
  trade_account_type?: AccountType
}

export interface AudioPreferences {
  sound_enabled: boolean
  sound_type: string
  volume: number
  persistent: boolean
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Alerts CRUD
export function getAlerts(): LocalAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveAlerts(alerts: LocalAlert[]): void {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export function createAlert(
  alert: Omit<LocalAlert, 'id' | 'created_at' | 'status'>
): LocalAlert {
  const newAlert: LocalAlert = {
    ...alert,
    id: generateId(),
    status: 'active',
    created_at: new Date().toISOString(),
  }
  const alerts = getAlerts()
  alerts.push(newAlert)
  saveAlerts(alerts)
  return newAlert
}

export function deleteAlert(id: string): void {
  const alerts = getAlerts().filter((a) => a.id !== id)
  saveAlerts(alerts)
}

export function deleteAlerts(ids: string[]): void {
  const idSet = new Set(ids)
  const alerts = getAlerts().filter((a) => !idSet.has(a.id))
  saveAlerts(alerts)
}

export function updateAlert(id: string, updates: Partial<LocalAlert>): void {
  const alerts = getAlerts().map((a) => (a.id === id ? { ...a, ...updates } : a))
  saveAlerts(alerts)
}

export function getActiveAlerts(symbol?: string): LocalAlert[] {
  let alerts = getAlerts().filter((a) => a.status === 'active')
  if (symbol) {
    alerts = alerts.filter((a) => a.symbol === symbol)
  }
  return alerts
}

// Audio preferences
export function getAudioPreferences(): AudioPreferences {
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY)
    return raw
      ? JSON.parse(raw)
      : { sound_enabled: true, sound_type: 'alert', volume: 1.0, persistent: false }
  } catch {
    return { sound_enabled: true, sound_type: 'alert', volume: 1.0, persistent: false }
  }
}

export function saveAudioPreferences(prefs: AudioPreferences): void {
  localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs))
}
