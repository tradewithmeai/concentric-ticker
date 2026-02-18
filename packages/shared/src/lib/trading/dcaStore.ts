import type { OrderSide, AccountType } from './types'

const DCA_KEY = 'concentric-dca-strategies'

export interface DCAStrategy {
  id: string
  symbol: string
  side: OrderSide
  quoteAmount: string          // per-period USDT amount (e.g. '50')
  totalBudget: string          // total to invest (e.g. '1000')
  totalSpent: string           // running total spent
  executionCount: number
  accountType: AccountType
  frequency: 'hourly' | 'daily' | 'weekly'
  scheduledTime: string        // 'HH:MM' for daily/weekly, 'start'|'end' for hourly
  dayOfWeek?: number           // 0=Sun..6=Sat (weekly only)
  enabled: boolean
  nextExecuteAt: string        // ISO timestamp
  lastExecutedAt?: string
  createdAt: string
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function getDCAStrategies(): DCAStrategy[] {
  try {
    const raw = localStorage.getItem(DCA_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveDCAStrategies(strategies: DCAStrategy[]): void {
  localStorage.setItem(DCA_KEY, JSON.stringify(strategies))
}

export function createDCAStrategy(
  data: Omit<DCAStrategy, 'id' | 'createdAt' | 'totalSpent' | 'executionCount' | 'nextExecuteAt'>
): DCAStrategy {
  const now = new Date()
  const strategy: DCAStrategy = {
    ...data,
    id: generateId(),
    totalSpent: '0',
    executionCount: 0,
    nextExecuteAt: computeNextExecution(data.frequency, data.scheduledTime, data.dayOfWeek, now),
    createdAt: now.toISOString(),
  }
  const strategies = getDCAStrategies()
  strategies.push(strategy)
  saveDCAStrategies(strategies)
  return strategy
}

export function updateDCAStrategy(id: string, updates: Partial<DCAStrategy>): void {
  const strategies = getDCAStrategies().map((s) =>
    s.id === id ? { ...s, ...updates } : s
  )
  saveDCAStrategies(strategies)
}

export function deleteDCAStrategy(id: string): void {
  const strategies = getDCAStrategies().filter((s) => s.id !== id)
  saveDCAStrategies(strategies)
}

/**
 * Compute the next execution ISO timestamp based on frequency and schedule.
 */
export function computeNextExecution(
  frequency: DCAStrategy['frequency'],
  scheduledTime: string,
  dayOfWeek?: number,
  from?: Date,
): string {
  const now = from ?? new Date()

  if (frequency === 'hourly') {
    const next = new Date(now)
    if (scheduledTime === 'end') {
      // End of current hour = XX:55
      next.setMinutes(55, 0, 0)
      if (next <= now) {
        next.setHours(next.getHours() + 1)
      }
    } else {
      // Start of next hour = XX:00
      next.setMinutes(0, 0, 0)
      next.setHours(next.getHours() + 1)
      if (scheduledTime === 'start' && now.getMinutes() === 0 && now.getSeconds() < 30) {
        // We're at the start of an hour, use current
        next.setHours(next.getHours() - 1)
      }
    }
    return next.toISOString()
  }

  // Parse HH:MM for daily and weekly
  const [hours, minutes] = scheduledTime.split(':').map(Number)

  if (frequency === 'daily') {
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    return next.toISOString()
  }

  if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)
    // Find the next occurrence of dayOfWeek
    const currentDay = next.getDay()
    let daysUntil = dayOfWeek - currentDay
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next.toISOString()
  }

  // Fallback: 1 hour from now
  return new Date(now.getTime() + 3600000).toISOString()
}
