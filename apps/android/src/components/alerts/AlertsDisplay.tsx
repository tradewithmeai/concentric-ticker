import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@concentric/shared/components/ui/card'
import { Button } from '@concentric/shared/components/ui/button'
import { Badge } from '@concentric/shared/components/ui/badge'
import { ScrollArea } from '@concentric/shared/components/ui/scroll-area'
import {
  Bell,
  X,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useToast } from '@concentric/shared/hooks/use-toast'
import { getAlerts, deleteAlert, deleteAlerts, LocalAlert } from '@concentric/shared/lib/localStore'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@concentric/shared/components/ui/alert-dialog'

interface Alert {
  id: string
  symbol: string
  target_price: number
  alert_type: 'price_cross' | 'percentage_change' | 'volume_spike' | 'trailing_stop'
  is_above: boolean
  percentage_threshold?: number
  trailing_percentage?: number
  triggered: boolean
  created_at: string
  triggered_at?: string
}

interface AlertsDisplayProps {
  symbol?: string // Optional: filter by symbol
  onAlertsChange?: (count: number) => void // Callback when alerts change
}

// Map LocalAlert to the component's Alert interface
function mapLocalAlerts(localAlerts: LocalAlert[], symbol?: string): Alert[] {
  let filtered = localAlerts.filter((a) => a.status === 'active')
  if (symbol) {
    filtered = filtered.filter((a) => a.symbol === symbol)
  }
  return filtered.map((a) => ({
    id: a.id,
    symbol: a.symbol,
    target_price: a.target_price,
    alert_type: a.alert_type as Alert['alert_type'],
    is_above: a.direction === 'above',
    percentage_threshold: undefined,
    trailing_percentage: a.trailing_percent,
    triggered: a.status === 'triggered',
    created_at: a.created_at,
    triggered_at: a.triggered_at,
  }))
}

export const AlertsDisplay: React.FC<AlertsDisplayProps> = ({ symbol, onAlertsChange }) => {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const loadAlerts = useCallback(() => {
    try {
      const localAlerts = getAlerts()
      const mapped = mapLocalAlerts(localAlerts, symbol)
      setAlerts(mapped)
    } catch (error) {
      console.error('Error loading alerts:', error)
      toast({
        title: 'Error loading alerts',
        description: 'Failed to fetch your alerts.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [symbol, toast])

  useEffect(() => {
    loadAlerts()
    // Poll localStorage for changes (replaces realtime subscription)
    const interval = setInterval(loadAlerts, 2000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  useEffect(() => {
    onAlertsChange?.(alerts.length)
  }, [alerts, onAlertsChange])

  const cancelAlert = (alertId: string) => {
    setDeletingIds((prev) => new Set([...prev, alertId]))

    try {
      deleteAlert(alertId)
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))

      toast({
        title: 'Alert cancelled',
        description: 'The alert has been removed.',
      })
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to cancel alert.',
        variant: 'destructive',
      })
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(alertId)
        return newSet
      })
    }
  }

  const cancelAllAlerts = () => {
    if (alerts.length === 0) return

    try {
      const alertIds = alerts.map((a) => a.id)
      deleteAlerts(alertIds)
      setAlerts([])

      toast({
        title: 'All alerts cancelled',
        description: `${alertIds.length} alert(s) have been removed.`,
      })
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to cancel all alerts.',
        variant: 'destructive',
      })
    }
  }

  const getAlertIcon = (alert: Alert) => {
    switch (alert.alert_type) {
      case 'price_cross':
        return alert.is_above ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )
      case 'percentage_change':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'trailing_stop':
        return <Activity className="w-4 h-4 text-purple-500" />
      default:
        return <Bell className="w-4 h-4 text-blue-500" />
    }
  }

  const getAlertDescription = (alert: Alert) => {
    const symbolName = alert.symbol.replace('USDT', '')

    switch (alert.alert_type) {
      case 'price_cross':
        return `${symbolName} ${alert.is_above ? 'above' : 'below'} $${alert.target_price.toFixed(4)}`
      case 'percentage_change':
        return `${symbolName} ${alert.is_above ? 'up' : 'down'} ${alert.percentage_threshold}%`
      case 'trailing_stop':
        return `${symbolName} trailing stop ${alert.trailing_percentage}%`
      default:
        return `${symbolName} alert`
    }
  }

  const getAlertTypeLabel = (type: Alert['alert_type']) => {
    switch (type) {
      case 'price_cross':
        return 'Price'
      case 'percentage_change':
        return 'Percent'
      case 'trailing_stop':
        return 'Trailing'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  // Group alerts by symbol
  const alertsBySymbol = alerts.reduce(
    (acc, alert) => {
      const sym = alert.symbol
      if (!acc[sym]) acc[sym] = []
      acc[sym].push(alert)
      return acc
    },
    {} as Record<string, Alert[]>
  )

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-white">Active Alerts</h3>
            {alerts.length > 0 && (
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {alerts.length}
              </Badge>
            )}
          </div>

          {alerts.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-900/20 border-red-700 hover:bg-red-900/40 text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Cancel All Alerts?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This will cancel all {alerts.length} active alert(s). This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                    Keep Alerts
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={cancelAllAlerts}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Cancel All Alerts
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        {alerts.length === 0 ? (
          <div className="p-8 text-center">
            <XCircle className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No active alerts</p>
            <p className="text-gray-500 text-sm mt-1">
              Create alerts from the technical indicators or alert manager
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {Object.entries(alertsBySymbol).map(([sym, symbolAlerts]) => (
              <div key={sym} className="space-y-2">
                {!symbol && (
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    {sym.replace('USDT', '')}
                  </div>
                )}
                {symbolAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">
                            {getAlertDescription(alert)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs border-gray-600 text-gray-400"
                          >
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          Created {formatDate(alert.created_at)}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelAlert(alert.id)}
                      disabled={deletingIds.has(alert.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                    >
                      {deletingIds.has(alert.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {alerts.length > 5 && (
        <div className="p-2 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Showing {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </Card>
  )
}
