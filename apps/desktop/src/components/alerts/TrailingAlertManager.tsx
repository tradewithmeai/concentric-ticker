import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@concentric/shared/components/ui/card'
import { Input } from '@concentric/shared/components/ui/input'
import { Button } from '@concentric/shared/components/ui/button'
import { Badge } from '@concentric/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@concentric/shared/components/ui/select'
import { Switch } from '@concentric/shared/components/ui/switch'
import { Label } from '@concentric/shared/components/ui/label'
import { TrendingUp, TrendingDown, Plus, X, Target } from 'lucide-react'
import { useToast } from '@concentric/shared/hooks/use-toast'
import {
  getAlerts,
  createAlert,
  deleteAlert,
  updateAlert,
  getAudioPreferences,
  LocalAlert,
} from '@concentric/shared/lib/localStore'
import { executeAlertTrade } from '@concentric/shared/lib/trading/executeAlertTrade'

interface TrailingAlert {
  id: string
  symbol: string
  target_price: number
  trail_percentage: number
  trail_direction: 'up' | 'down'
  trail_trigger_price: number
  trail_high_watermark?: number
  trail_low_watermark?: number
  auto_trigger: boolean
  triggered: boolean
  created_at: string
}

interface TrailingAlertManagerProps {
  symbol: string
  currentPrice?: number
}

// Map LocalAlert to TrailingAlert interface
function mapToTrailingAlert(a: LocalAlert): TrailingAlert {
  return {
    id: a.id,
    symbol: a.symbol,
    target_price: a.target_price,
    trail_percentage: a.trailing_percent || 0,
    trail_direction: a.direction === 'above' ? 'up' : 'down',
    trail_trigger_price: a.target_price,
    trail_high_watermark: a.trailing_high,
    trail_low_watermark: undefined,
    auto_trigger: true,
    triggered: a.status === 'triggered',
    created_at: a.created_at,
  }
}

export const TrailingAlertManager: React.FC<TrailingAlertManagerProps> = ({
  symbol,
  currentPrice,
}) => {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<TrailingAlert[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [trailDirection, setTrailDirection] = useState<'up' | 'down'>('up')
  const [trailPercentage, setTrailPercentage] = useState('')
  const [autoTrigger, setAutoTrigger] = useState(true)
  const [manualTriggerPrice, setManualTriggerPrice] = useState('')

  const loadTrailingAlerts = useCallback(() => {
    try {
      const allAlerts = getAlerts()
      const filtered = allAlerts.filter(
        (a) => a.status === 'active' && a.symbol === symbol && a.alert_type === 'trailing_stop'
      )
      setAlerts(filtered.map(mapToTrailingAlert))
    } catch (error) {
      console.error('Error loading trailing alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    loadTrailingAlerts()
  }, [loadTrailingAlerts])

  useEffect(() => {
    if (currentPrice && alerts.length > 0) {
      updateTrailingAlerts()
    }
  }, [currentPrice, alerts])

  const updateTrailingAlerts = useCallback(() => {
    if (!currentPrice) return

    for (const alert of alerts) {
      if (alert.triggered) continue

      let needsUpdate = false
      let newTriggerPrice = alert.trail_trigger_price
      let newHighWatermark = alert.trail_high_watermark || currentPrice
      let newLowWatermark = alert.trail_low_watermark || currentPrice

      if (alert.trail_direction === 'up') {
        // Track highest price and adjust trigger downward
        if (currentPrice > newHighWatermark) {
          newHighWatermark = currentPrice
          newTriggerPrice = currentPrice * (1 - alert.trail_percentage / 100)
          needsUpdate = true
        }

        // Check if alert should trigger
        if (currentPrice <= alert.trail_trigger_price) {
          triggerTrailingAlert(alert)
          continue
        }
      } else {
        // Track lowest price and adjust trigger upward
        if (currentPrice < newLowWatermark) {
          newLowWatermark = currentPrice
          newTriggerPrice = currentPrice * (1 + alert.trail_percentage / 100)
          needsUpdate = true
        }

        // Check if alert should trigger
        if (currentPrice >= alert.trail_trigger_price) {
          triggerTrailingAlert(alert)
          continue
        }
      }

      if (needsUpdate) {
        try {
          updateAlert(alert.id, {
            target_price: newTriggerPrice,
            trailing_high: newHighWatermark,
          })

          setAlerts((prev) =>
            prev.map((a) =>
              a.id === alert.id
                ? {
                    ...a,
                    trail_trigger_price: newTriggerPrice,
                    trail_high_watermark: newHighWatermark,
                    trail_low_watermark: newLowWatermark,
                  }
                : a
            )
          )
        } catch (error) {
          console.error('Error updating trailing alert:', error)
        }
      }
    }
  }, [currentPrice, alerts])

  const triggerTrailingAlert = async (alert: TrailingAlert) => {
    try {
      // Update alert as triggered
      updateAlert(alert.id, {
        status: 'triggered',
        triggered_at: new Date().toISOString(),
      })

      // Play audio notification
      playAudioAlert()

      // Remove from local state
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id))

      toast({
        title: 'Trailing Alert Triggered!',
        description: `${symbol.replace('USDT', '')} ${alert.trail_direction === 'up' ? 'fell below' : 'rose above'} $${alert.trail_trigger_price.toFixed(4)}`,
        duration: 8000,
      })

      // Execute trade if configured
      const localAlert = getAlerts().find((a) => a.id === alert.id)
      if (localAlert?.trade_enabled) {
        const result = await executeAlertTrade(localAlert)
        if (result?.success) {
          toast({
            title: 'Trade Executed',
            description: `${localAlert.trade_side} ${localAlert.trade_quantity} ${symbol.replace('USDT', '')} @ $${alert.trail_trigger_price.toFixed(2)}`,
            duration: 10000,
          })
        } else if (result) {
          toast({
            title: 'Trade Failed',
            description: result.error,
            variant: 'destructive',
            duration: 10000,
          })
        }
      }
    } catch (error) {
      console.error('Error triggering trailing alert:', error)
    }
  }

  const playAudioAlert = () => {
    try {
      const prefs = getAudioPreferences()

      if (prefs.sound_enabled) {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!AudioContextClass) return
        const audioContext = new AudioContextClass()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        const frequencies: Record<string, number> = {
          chime: 800,
          bell: 1000,
          notification: 600,
          alert: 1200,
          beep: 880,
        }

        oscillator.frequency.setValueAtTime(
          frequencies[prefs.sound_type] || 880,
          audioContext.currentTime
        )
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(prefs.volume * 0.3, audioContext.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      }
    } catch (error) {
      console.error('Error playing audio alert:', error)
    }
  }

  const addTrailingAlert = () => {
    if (!trailPercentage || isNaN(parseFloat(trailPercentage))) {
      toast({
        title: 'Invalid percentage',
        description: 'Please enter a valid trail percentage.',
        variant: 'destructive',
      })
      return
    }

    if (!autoTrigger && (!manualTriggerPrice || isNaN(parseFloat(manualTriggerPrice)))) {
      toast({
        title: 'Invalid trigger price',
        description: 'Please enter a valid trigger price or enable auto-trigger.',
        variant: 'destructive',
      })
      return
    }

    if (!currentPrice) {
      toast({
        title: 'Price unavailable',
        description: 'Current price is not available. Please try again.',
        variant: 'destructive',
      })
      return
    }

    try {
      const percentage = parseFloat(trailPercentage)
      const triggerPrice = autoTrigger
        ? trailDirection === 'up'
          ? currentPrice * (1 - percentage / 100)
          : currentPrice * (1 + percentage / 100)
        : parseFloat(manualTriggerPrice)

      const newAlert = createAlert({
        symbol,
        target_price: triggerPrice,
        direction: trailDirection === 'up' ? 'above' : 'below',
        alert_type: 'trailing_stop',
        trailing_percent: percentage,
        trailing_high: trailDirection === 'up' ? currentPrice : undefined,
      })

      const typedAlert = mapToTrailingAlert(newAlert)
      // Override with the computed trigger price
      typedAlert.trail_trigger_price = triggerPrice
      typedAlert.trail_high_watermark = trailDirection === 'up' ? currentPrice : undefined
      typedAlert.trail_low_watermark = trailDirection === 'down' ? currentPrice : undefined

      setAlerts((prev) => [typedAlert, ...prev])
      setTrailPercentage('')
      setManualTriggerPrice('')

      toast({
        title: 'Trailing alert created',
        description: `Trailing stop set for ${symbol.replace('USDT', '')}`,
      })
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to create trailing alert.',
        variant: 'destructive',
      })
    }
  }

  const removeAlert = (id: string) => {
    try {
      deleteAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))

      toast({
        title: 'Trailing alert removed',
        description: 'Alert has been deleted.',
      })
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to remove alert.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-700 p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-white">Trailing Alerts</span>
            {alerts.length > 0 && (
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {alerts.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Label className="text-white text-sm">Direction:</Label>
            <Select
              value={trailDirection}
              onValueChange={(value: 'up' | 'down') => setTrailDirection(value)}
            >
              <SelectTrigger className="w-24 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="up" className="text-white">
                  Up
                </SelectItem>
                <SelectItem value="down" className="text-white">
                  Down
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <Input
              placeholder="Trail %"
              value={trailPercentage}
              onChange={(e) => setTrailPercentage(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              type="number"
              step="0.1"
              min="0.1"
            />
            <span className="text-white text-sm">%</span>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={autoTrigger} onCheckedChange={setAutoTrigger} />
            <Label className="text-white text-sm">Auto-trigger</Label>
          </div>

          {!autoTrigger && (
            <Input
              placeholder="Manual trigger price"
              value={manualTriggerPrice}
              onChange={(e) => setManualTriggerPrice(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              type="number"
              step="any"
            />
          )}

          <Button
            onClick={addTrailingAlert}
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Trailing Alert
          </Button>
        </div>

        {/* Active Alerts List */}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-4">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No active trailing alerts</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-2 rounded bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  {alert.trail_direction === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-white text-sm">
                      {alert.trail_percentage}% {alert.trail_direction}
                    </span>
                    <span className="text-gray-400 text-xs">
                      Trigger: ${alert.trail_trigger_price.toFixed(4)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  )
}
