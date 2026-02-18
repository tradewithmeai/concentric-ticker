import { useEffect, useRef, useCallback, useState } from 'react'
import {
  getDCAStrategies,
  updateDCAStrategy,
  computeNextExecution,
  DCAStrategy,
} from '../lib/trading/dcaStore'
import { executeDCATrade } from '../lib/trading/executeDCATrade'
import { useToast } from './use-toast'

interface LastExecution {
  strategyId: string
  symbol: string
  success: boolean
  message: string
  timestamp: string
}

const CHECK_INTERVAL = 30_000 // 30 seconds

/**
 * Background DCA scheduler hook.
 * Checks every 30 seconds if any enabled DCA strategy is due for execution.
 */
export function useDCAScheduler() {
  const { toast } = useToast()
  const [strategies, setStrategies] = useState<DCAStrategy[]>(() => getDCAStrategies())
  const [lastExecution, setLastExecution] = useState<LastExecution | null>(null)
  const executedKeys = useRef<Set<string>>(new Set())
  const executingRef = useRef(false)

  const refreshStrategies = useCallback(() => {
    setStrategies(getDCAStrategies())
  }, [])

  const executeStrategy = useCallback(
    async (strategy: DCAStrategy) => {
      const key = `${strategy.id}-${strategy.nextExecuteAt}`
      if (executedKeys.current.has(key)) return
      executedKeys.current.add(key)

      const sym = strategy.symbol.replace('USDT', '')

      const result = await executeDCATrade(strategy)

      const now = new Date()
      const newTotalSpent =
        parseFloat(strategy.totalSpent) + parseFloat(strategy.quoteAmount)
      const budgetExhausted = newTotalSpent >= parseFloat(strategy.totalBudget)

      const updates: Partial<DCAStrategy> = {
        totalSpent: String(newTotalSpent),
        executionCount: strategy.executionCount + 1,
        lastExecutedAt: now.toISOString(),
        nextExecuteAt: computeNextExecution(
          strategy.frequency,
          strategy.scheduledTime,
          strategy.dayOfWeek,
          now
        ),
      }

      if (budgetExhausted) {
        updates.enabled = false
      }

      updateDCAStrategy(strategy.id, updates)

      if (result.success) {
        const execMsg = `DCA ${strategy.side} $${strategy.quoteAmount} ${sym}`
        toast({
          title: 'DCA Order Executed',
          description: budgetExhausted
            ? `${execMsg} — Budget reached, strategy paused`
            : execMsg,
          duration: 8000,
        })
        setLastExecution({
          strategyId: strategy.id,
          symbol: strategy.symbol,
          success: true,
          message: execMsg,
          timestamp: now.toISOString(),
        })
      } else {
        toast({
          title: 'DCA Order Failed',
          description: `${sym}: ${result.error}`,
          variant: 'destructive',
          duration: 10000,
        })
        setLastExecution({
          strategyId: strategy.id,
          symbol: strategy.symbol,
          success: false,
          message: result.error || 'Unknown error',
          timestamp: now.toISOString(),
        })
      }

      refreshStrategies()
    },
    [toast, refreshStrategies]
  )

  useEffect(() => {
    const check = async () => {
      if (executingRef.current) return
      executingRef.current = true

      try {
        const allStrategies = getDCAStrategies()
        const now = Date.now()

        for (const strategy of allStrategies) {
          if (!strategy.enabled) continue

          const executeAt = new Date(strategy.nextExecuteAt).getTime()
          if (now >= executeAt) {
            await executeStrategy(strategy)
          }
        }
      } finally {
        executingRef.current = false
      }
    }

    // Check immediately on mount
    check()

    const interval = setInterval(check, CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [executeStrategy])

  return { strategies, lastExecution, refreshStrategies }
}
