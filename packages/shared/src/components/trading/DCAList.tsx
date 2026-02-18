import React from 'react'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { Trash2, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'
import {
  DCAStrategy,
  updateDCAStrategy,
  deleteDCAStrategy,
} from '../../lib/trading/dcaStore'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DCAListProps {
  strategies: DCAStrategy[]
  onChanged: () => void
}

function formatSchedule(s: DCAStrategy): string {
  if (s.frequency === 'hourly') {
    return `Every hour (${s.scheduledTime === 'end' ? 'XX:55' : 'XX:00'})`
  }
  if (s.frequency === 'weekly') {
    return `${DAYS[s.dayOfWeek ?? 0]} at ${s.scheduledTime}`
  }
  return `Daily at ${s.scheduledTime}`
}

function formatNextExecution(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()

  if (diffMs < 0) return 'Due now'
  if (diffMs < 60_000) return `${Math.ceil(diffMs / 1000)}s`
  if (diffMs < 3600_000) return `${Math.ceil(diffMs / 60_000)}m`
  if (diffMs < 86400_000) {
    const h = Math.floor(diffMs / 3600_000)
    const m = Math.ceil((diffMs % 3600_000) / 60_000)
    return `${h}h ${m}m`
  }
  return d.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export const DCAList: React.FC<DCAListProps> = ({ strategies, onChanged }) => {
  const { toast } = useToast()

  const handleToggle = (id: string, enabled: boolean) => {
    updateDCAStrategy(id, { enabled })
    onChanged()
    toast({
      title: enabled ? 'Strategy enabled' : 'Strategy paused',
      duration: 3000,
    })
  }

  const handleDelete = (id: string) => {
    deleteDCAStrategy(id)
    onChanged()
    toast({ title: 'Strategy deleted', duration: 3000 })
  }

  if (strategies.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        No DCA strategies yet. Create one above.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-white">Active Strategies</h4>

      {strategies.map((s) => {
        const spent = parseFloat(s.totalSpent)
        const budget = parseFloat(s.totalBudget)
        const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
        const sym = s.symbol.replace('USDT', '')

        return (
          <div
            key={s.id}
            className="bg-gray-800 rounded-lg p-3 space-y-2"
          >
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {s.side === 'BUY' ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className="text-white font-medium">{sym}</span>
                <Badge
                  variant="secondary"
                  className={s.side === 'BUY' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}
                >
                  {s.side} ${s.quoteAmount}
                </Badge>
                <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                  {s.accountType}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.enabled}
                  onCheckedChange={(v) => handleToggle(s.id, v)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(s.id)}
                  className="text-gray-400 hover:text-red-400 h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Schedule + next */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatSchedule(s)}
              </div>
              {s.enabled && (
                <span className="text-blue-400">
                  Next: {formatNextExecution(s.nextExecuteAt)}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>${spent.toFixed(2)} / ${budget.toFixed(2)}</span>
                <span>{s.executionCount} orders</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Last execution */}
            {s.lastExecutedAt && (
              <div className="text-xs text-gray-500">
                Last: {new Date(s.lastExecutedAt).toLocaleString()}
              </div>
            )}
          </div>
        )
      })}

      <p className="text-xs text-gray-500 text-center pt-2">
        Strategies only execute while the app is open
      </p>
    </div>
  )
}
