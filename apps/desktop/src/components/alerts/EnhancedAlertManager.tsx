import React, { useState, useEffect, useCallback } from 'react'
import { AlertType } from '@concentric/shared/lib/types'
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
import { Bell, Plus, X, AlertTriangle, TrendingUp, TrendingDown, Volume2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@concentric/shared/components/ui/tabs'
import { useToast } from '@concentric/shared/hooks/use-toast'
import {
  getAlerts,
  createAlert,
  deleteAlert,
  updateAlert,
  getAudioPreferences,
  LocalAlert,
} from '@concentric/shared/lib/localStore'
import { TrailingAlertManager } from './TrailingAlertManager'

interface Alert {
  id: string
  symbol: string
  target_price: number
  alert_type: 'price_cross' | 'percentage_change' | 'volume_spike' | 'trailing_stop'
  is_above: boolean
  percentage_threshold?: number
  triggered: boolean
  created_at: string
}

interface EnhancedAlertManagerProps {
  symbol: string
  currentPrice?: number
}

// Map LocalAlert to the component's Alert interface
function mapLocalAlert(a: LocalAlert): Alert {
  return {
    id: a.id,
    symbol: a.symbol,
    target_price: a.target_price,
    alert_type: a.alert_type as Alert['alert_type'],
    is_above: a.direction === 'above',
    percentage_threshold: a.trailing_percent,
    triggered: a.status === 'triggered',
    created_at: a.created_at,
  }
}

export const EnhancedAlertManager: React.FC<EnhancedAlertManagerProps> = ({
  symbol,
  currentPrice,
}) => {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [alertType, setAlertType] = useState<'price_cross' | 'percentage_change' | 'trailing_stop'>(
    'price_cross'
  )
  const [targetPrice, setTargetPrice] = useState('')
  const [percentageThreshold, setPercentageThreshold] = useState('')
  const [isAbove, setIsAbove] = useState(true)

  const loadAlerts = useCallback(() => {
    try {
      const allAlerts = getAlerts()
      const filtered = allAlerts.filter(
        (a) => a.status === 'active' && a.alert_type !== 'trailing_stop'
      )
      setAlerts(filtered.map(mapLocalAlert))
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    if (currentPrice && alerts.length > 0) {
      checkTriggeredAlerts()
    }
  }, [currentPrice, alerts])

  const checkTriggeredAlerts = useCallback(() => {
    if (!currentPrice) return

    const triggeredAlerts = alerts.filter((alert) => {
      if (alert.triggered) return false

      if (alert.alert_type === 'price_cross') {
        return alert.is_above
          ? currentPrice >= alert.target_price
          : currentPrice <= alert.target_price
      }

      if (alert.alert_type === 'percentage_change' && alert.percentage_threshold) {
        const changePercent = ((currentPrice - alert.target_price) / alert.target_price) * 100
        return alert.is_above
          ? changePercent >= alert.percentage_threshold
          : changePercent <= -alert.percentage_threshold
      }

      return false
    })

    for (const alert of triggeredAlerts) {
      triggerAlert(alert)
    }
  }, [currentPrice, alerts])

  const triggerAlert = (alert: Alert) => {
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

      const alertMessage =
        alert.alert_type === 'price_cross'
          ? `${symbol.replace('USDT', '')} ${alert.is_above ? 'above' : 'below'} $${alert.target_price}`
          : `${symbol.replace('USDT', '')} moved ${alert.percentage_threshold}%`

      toast({
        title: 'Price Alert Triggered!',
        description: alertMessage,
        duration: 8000,
      })
    } catch (error) {
      console.error('Error triggering alert:', error)
    }
  }

  const playAudioAlert = () => {
    try {
      const prefs = getAudioPreferences()

      if (prefs.sound_enabled) {
        // Create a more reliable audio alert using Web Audio API
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!AudioContextClass) return
        const audioContext = new AudioContextClass()

        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Configure sound based on user preference
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

        // Set volume and make it loud
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(prefs.volume * 0.3, audioContext.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)

        // Play a second beep after a short delay for emphasis
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator()
          const gainNode2 = audioContext.createGain()

          oscillator2.connect(gainNode2)
          gainNode2.connect(audioContext.destination)

          oscillator2.frequency.setValueAtTime(
            frequencies[prefs.sound_type] || 880,
            audioContext.currentTime
          )
          oscillator2.type = 'sine'

          gainNode2.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode2.gain.linearRampToValueAtTime(prefs.volume * 0.3, audioContext.currentTime + 0.01)
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

          oscillator2.start(audioContext.currentTime)
          oscillator2.stop(audioContext.currentTime + 0.5)
        }, 600)
      }
    } catch (error) {
      console.error('Error playing audio alert:', error)
    }
  }

  const addAlert = () => {
    if (alertType === 'price_cross' && (!targetPrice || isNaN(parseFloat(targetPrice)))) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid target price.',
        variant: 'destructive',
      })
      return
    }

    if (
      alertType === 'percentage_change' &&
      (!percentageThreshold || isNaN(parseFloat(percentageThreshold)))
    ) {
      toast({
        title: 'Invalid percentage',
        description: 'Please enter a valid percentage threshold.',
        variant: 'destructive',
      })
      return
    }

    try {
      const newAlert = createAlert({
        symbol,
        target_price: alertType === 'price_cross' ? parseFloat(targetPrice) : currentPrice || 0,
        direction: isAbove ? 'above' : 'below',
        alert_type: alertType,
        trailing_percent:
          alertType === 'percentage_change' ? parseFloat(percentageThreshold) : undefined,
      })

      setAlerts((prev) => [mapLocalAlert(newAlert), ...prev])
      setTargetPrice('')
      setPercentageThreshold('')

      toast({
        title: 'Alert created',
        description: `Alert set for ${symbol.replace('USDT', '')}`,
      })
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to create alert.',
        variant: 'destructive',
      })
    }
  }

  const removeAlert = (id: string) => {
    try {
      deleteAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))

      toast({
        title: 'Alert removed',
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
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="basic" className="data-[state=active]:bg-gray-700">
            <Bell className="w-4 h-4 mr-2" />
            Basic Alerts
            {alerts.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-600 text-white">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trailing" className="data-[state=active]:bg-gray-700">
            Trailing Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          {/* Alert Type Selection */}
          <div className="space-y-2">
            <Select value={alertType} onValueChange={(value: AlertType) => setAlertType(value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="price_cross" className="text-white">
                  Price Cross Alert
                </SelectItem>
                <SelectItem value="percentage_change" className="text-white">
                  Percentage Change Alert
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert Configuration */}
          <div className="space-y-3">
            {alertType === 'price_cross' && (
              <div className="flex gap-2">
                <Select
                  value={isAbove ? 'above' : 'below'}
                  onValueChange={(value) => setIsAbove(value === 'above')}
                >
                  <SelectTrigger className="w-24 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="above" className="text-white">
                      Above
                    </SelectItem>
                    <SelectItem value="below" className="text-white">
                      Below
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  type="number"
                  step="any"
                />
                <Button onClick={addAlert} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {alertType === 'percentage_change' && (
              <div className="flex gap-2">
                <Select
                  value={isAbove ? 'up' : 'down'}
                  onValueChange={(value) => setIsAbove(value === 'up')}
                >
                  <SelectTrigger className="w-20 bg-gray-800 border-gray-700 text-white">
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
                <Input
                  placeholder="% threshold"
                  value={percentageThreshold}
                  onChange={(e) => setPercentageThreshold(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  type="number"
                  step="0.1"
                  min="0"
                />
                <span className="text-white self-center">%</span>
                <Button onClick={addAlert} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Active Alerts List */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {loading ? (
              <p className="text-gray-400 text-sm text-center py-4">Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No active alerts</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-2 rounded bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    {alert.alert_type === 'price_cross' ? (
                      <>
                        {alert.is_above ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-white text-sm">
                          {alert.is_above ? 'Above' : 'Below'} ${alert.target_price.toFixed(4)}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-white text-sm">
                          {alert.is_above ? '+' : '-'}
                          {alert.percentage_threshold}%
                        </span>
                      </>
                    )}
                    <Volume2 className="w-3 h-3 text-gray-400" />
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
        </TabsContent>

        <TabsContent value="trailing" className="mt-4">
          <TrailingAlertManager symbol={symbol} currentPrice={currentPrice} />
        </TabsContent>
      </Tabs>
    </Card>
  )
}
