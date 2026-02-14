import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@concentric/shared/components/ui/card'
import { Input } from '@concentric/shared/components/ui/input'
import { Button } from '@concentric/shared/components/ui/button'
import { Badge } from '@concentric/shared/components/ui/badge'
import { Bell, Plus, X, AlertTriangle } from 'lucide-react'
import { useToast } from '@concentric/shared/hooks/use-toast'

interface Alert {
  id: string
  price: number
  triggered: boolean
  createdAt: number
}

interface AlertManagerProps {
  symbol: string
  currentPrice?: number
}

export const AlertManager: React.FC<AlertManagerProps> = ({ symbol, currentPrice }) => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [newAlertPrice, setNewAlertPrice] = useState('')
  const [activeAlert, setActiveAlert] = useState<string | null>(null)
  const { toast } = useToast()

  // Load alerts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`alerts-${symbol}`)
    if (saved) {
      try {
        setAlerts(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading alerts:', error)
      }
    }
  }, [symbol])

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem(`alerts-${symbol}`, JSON.stringify(alerts))
  }, [alerts, symbol])

  // Check for triggered alerts
  useEffect(() => {
    if (!currentPrice) return

    alerts.forEach((alert) => {
      if (!alert.triggered) {
        const shouldTrigger =
          (alert.price >= currentPrice && alert.price <= currentPrice * 1.001) ||
          (alert.price <= currentPrice && alert.price >= currentPrice * 0.999)

        if (shouldTrigger) {
          triggerAlert(alert)
        }
      }
    })
  }, [currentPrice, alerts, triggerAlert])

  const triggerAlert = useCallback(
    (alert: Alert) => {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, triggered: true } : a)))

      setActiveAlert(alert.id)

      toast({
        title: `Price Alert Triggered!`,
        description: `${symbol.replace('USDT', '')} reached $${alert.price.toFixed(4)}`,
        duration: 5000,
      })

      // Auto-remove active state after animation
      setTimeout(() => {
        setActiveAlert(null)
      }, 3000)
    },
    [setAlerts, setActiveAlert, toast, symbol]
  )

  const addAlert = () => {
    const price = parseFloat(newAlertPrice)
    if (isNaN(price) || price <= 0) return

    const newAlert: Alert = {
      id: Date.now().toString(),
      price,
      triggered: false,
      createdAt: Date.now(),
    }

    setAlerts((prev) => [...prev, newAlert])
    setNewAlertPrice('')

    toast({
      title: 'Alert Added',
      description: `Alert set for ${symbol.replace('USDT', '')} at $${price.toFixed(4)}`,
    })
  }

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const clearTriggered = () => {
    setAlerts((prev) => prev.filter((a) => !a.triggered))
  }

  return (
    <Card className="bg-gray-900 border-gray-700 p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold text-white">Price Alerts</span>
            {alerts.filter((a) => !a.triggered).length > 0 && (
              <Badge variant="secondary" className="bg-yellow-600 text-white">
                {alerts.filter((a) => !a.triggered).length}
              </Badge>
            )}
          </div>
          {alerts.some((a) => a.triggered) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearTriggered}
              className="text-xs bg-gray-800 border-gray-700"
            >
              Clear Triggered
            </Button>
          )}
        </div>

        {/* Add new alert */}
        <div className="flex gap-2">
          <Input
            placeholder="Alert price"
            value={newAlertPrice}
            onChange={(e) => setNewAlertPrice(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAlert()}
            className="bg-gray-800 border-gray-700 text-white"
            type="number"
            step="any"
          />
          <Button
            onClick={addAlert}
            size="sm"
            disabled={!newAlertPrice.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Alert list */}
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No alerts set</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-2 rounded ${
                  alert.triggered
                    ? 'bg-green-900/30 border border-green-700'
                    : activeAlert === alert.id
                      ? 'bg-yellow-900/30 border border-yellow-700 animate-pulse'
                      : 'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {alert.triggered ? (
                    <AlertTriangle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Bell className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-white text-sm">${alert.price.toFixed(4)}</span>
                  {alert.triggered && (
                    <Badge variant="secondary" className="bg-green-700 text-white text-xs">
                      Triggered
                    </Badge>
                  )}
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
