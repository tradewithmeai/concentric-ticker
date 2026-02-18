import React, { useState, useEffect, useCallback, Suspense, lazy, startTransition } from 'react'
import { ConcentricTicker } from './ConcentricTicker'

// Lazy load heavy components that aren't shown initially
const AssetSelector = lazy(() =>
  import('./AssetSelector').then((m) => ({ default: m.AssetSelector }))
)
import { getAlerts, deleteAlert, deleteAlerts, LocalAlert } from '@concentric/shared/lib/localStore'
import { useToast } from '@concentric/shared/hooks/use-toast'
import { useCryptoData } from '@concentric/shared/hooks/useCryptoData'
import { useAlertChecker } from '@concentric/shared/hooks/useAlertChecker'
import { useDelayedTrue } from '@concentric/shared/hooks/useDelayedTrue'
import { announce } from '@concentric/shared/utils/announcements'
import { Plus, Settings, Bell, X, Trash2, BarChart3, RefreshCw } from 'lucide-react'
import { Button } from '@concentric/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@concentric/shared/components/ui/dialog'
import { TradingDialog } from '@concentric/shared/components/trading/TradingDialog'
import { DCADialog } from '@concentric/shared/components/trading/DCADialog'
import { AlertSoundSettings } from '@concentric/shared/components/AlertSoundSettings'
import { useDCAScheduler } from '@concentric/shared/hooks/useDCAScheduler'
import { OnboardingTutorial } from '@concentric/shared/components/OnboardingTutorial'

interface DisplayAlert {
  id: string
  symbol: string
  target_price: number
  is_above: boolean
  created_at: string
}

function mapToDisplayAlerts(localAlerts: LocalAlert[]): DisplayAlert[] {
  return localAlerts
    .filter((a) => a.status === 'active')
    .map((a) => ({
      id: a.id,
      symbol: a.symbol,
      target_price: a.target_price,
      is_above: a.direction === 'above',
      created_at: a.created_at,
    }))
}

export const MinimalCryptoTracker = () => {
  const { toast } = useToast()
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showTrading, setShowTrading] = useState(false)
  const [showDCA, setShowDCA] = useState(false)
  const [alerts, setAlerts] = useState<DisplayAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelingAlert, setCancelingAlert] = useState<string | null>(null)
  const [cancelingAll, setCancelingAll] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('concentric-onboarding-complete') !== 'true'
  )

  const loadAlerts = useCallback(() => {
    setLoading(true)
    try {
      const localAlerts = getAlerts()
      setAlerts(mapToDisplayAlerts(localAlerts))
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showAlerts) {
      loadAlerts()
    }
  }, [showAlerts, loadAlerts])

  const cancelAlertHandler = (alertId: string) => {
    if (cancelingAlert === alertId) return
    setCancelingAlert(alertId)
    try {
      deleteAlert(alertId)
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      toast({ title: 'Alert cancelled', description: 'Alert has been removed.' })
      announce('Alert cancelled successfully')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not cancel alert. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCancelingAlert(null)
    }
  }

  const cancelAllAlerts = () => {
    if (cancelingAll) return
    setCancelingAll(true)
    try {
      const alertIds = alerts.map((a) => a.id)
      deleteAlerts(alertIds)
      setAlerts([])
      toast({ title: 'All alerts cancelled', description: `${alertIds.length} alerts removed.` })
      announce(`All ${alertIds.length} alerts cancelled successfully`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not cancel all alerts. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCancelingAll(false)
    }
  }
  const {
    priceData,
    candleData,
    volumeData,
    isLoading,
    getTechnicalIndicators,
    getHistoricalPrices,
  } = useCryptoData(selectedAssets)

  // Check alerts against live prices in the background
  const { activeAlarm, silence } = useAlertChecker(priceData)

  // DCA scheduler — runs in background while app is open
  const { strategies: dcaStrategies, refreshStrategies: refreshDCA } = useDCAScheduler()

  const shouldShowSkeleton = useDelayedTrue(isLoading)

  // Load saved assets from localStorage on mount - deferred to avoid blocking
  useEffect(() => {
    startTransition(() => {
      const saved = localStorage.getItem('concentric-ticker-assets')
      if (saved) {
        try {
          const assets = JSON.parse(saved)
          setSelectedAssets(assets)
        } catch (error) {
          console.error('Error loading saved assets:', error)
        }
      } else {
        // DEBUG: Single asset for debugging - just BTC
        setSelectedAssets(['BTCUSDT'])
      }
    })
  }, [])

  // Save assets to localStorage whenever they change - deferred to avoid blocking
  useEffect(() => {
    if (selectedAssets.length > 0) {
      startTransition(() => {
        localStorage.setItem('concentric-ticker-assets', JSON.stringify(selectedAssets))
      })
    }
  }, [selectedAssets])

  const handleAssetChange = (assets: string[]) => {
    setSelectedAssets(assets)
    setShowSettings(false)
  }

  return (
    <div className="space-y-8">
      {/* First-time onboarding tutorial */}
      {showOnboarding && (
        <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Persistent alarm overlay */}
      {activeAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-6 p-8">
            <div className="text-red-500 text-6xl animate-pulse">
              <Bell className="w-16 h-16 mx-auto" />
            </div>
            <div className="text-white text-2xl font-bold">Alert Triggered!</div>
            <div className="text-gray-300 text-lg">{activeAlarm.description}</div>
            <Button
              onClick={silence}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white text-xl px-12 py-6 rounded-xl"
            >
              Silence Alarm
            </Button>
          </div>
        </div>
      )}

      {/* Live region for announcements */}
      <div aria-live="polite" className="sr-only" id="announcements" />

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <h3 className="sr-only">Control Panel</h3>
        {/* Alerts Dialog */}
        <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="bg-gray-800 border-gray-700 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="View and manage price alerts"
            >
              <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
              Alerts
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Alert Management</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-white">Active Alerts</h3>
                  {alerts.length > 0 && (
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      {alerts.length}
                    </span>
                  )}
                </div>
                {alerts.length > 0 && (
                  <Button
                    onClick={cancelAllAlerts}
                    disabled={cancelingAll}
                    aria-disabled={cancelingAll}
                    variant="outline"
                    size="sm"
                    className="bg-red-900/20 border-red-700 hover:bg-red-900/40 text-red-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Cancel all active price alerts"
                  >
                    <Trash2 className="w-4 h-4 mr-1" aria-hidden="true" />
                    {cancelingAll ? 'Clearing...' : 'Clear all'}
                  </Button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">Loading alerts...</div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No active alerts</p>
                    <p className="text-sm mt-1">Create alerts from technical indicators</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 rounded bg-gray-800 mb-2 hover:bg-gray-750"
                    >
                      <div>
                        <div className="text-white text-sm">
                          {alert.symbol.replace('USDT', '')} {alert.is_above ? 'above' : 'below'} $
                          {alert.target_price.toFixed(4)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => cancelAlertHandler(alert.id)}
                        disabled={cancelingAlert === alert.id}
                        aria-disabled={cancelingAlert === alert.id}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        aria-label={`Cancel alert for ${alert.symbol.replace('USDT', '')} ${alert.is_above ? 'above' : 'below'} $${alert.target_price.toFixed(4)}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Trading Dialog */}
        <Button
          variant="outline"
          className="bg-gray-800 border-gray-700 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Open trading panel"
          onClick={() => setShowTrading(true)}
        >
          <BarChart3 className="w-4 h-4 mr-2" aria-hidden="true" />
          Trading
        </Button>
        <TradingDialog open={showTrading} onOpenChange={setShowTrading} />

        {/* DCA Dialog */}
        <Button
          variant="outline"
          className="bg-gray-800 border-gray-700 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Open DCA strategies"
          onClick={() => setShowDCA(true)}
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          DCA
        </Button>
        <DCADialog
          open={showDCA}
          onOpenChange={setShowDCA}
          strategies={dcaStrategies}
          onChanged={refreshDCA}
        />

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="bg-gray-800 border-gray-700 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Open settings to manage cryptocurrency assets"
            >
              <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <Suspense fallback={<div className="p-4 text-gray-400">Loading...</div>}>
              <AssetSelector selectedAssets={selectedAssets} onAssetsChange={handleAssetChange} />
            </Suspense>
            <div className="border-t border-gray-700 pt-4 mt-4">
              <AlertSoundSettings />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Asset Display */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center"
        aria-busy={shouldShowSkeleton}
        aria-description="Live cryptocurrency price tickers with multi-timeframe volume analysis. Each ticker shows price movements across 5-minute to 1-day timeframes. Use tab key to navigate between assets."
      >
        <h3 className="sr-only">Live Price Tickers</h3>
        {shouldShowSkeleton
          ? // Skeleton for first load
            Array.from({ length: Math.min(selectedAssets.length || 1, 4) }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="w-full max-w-[320px] h-[167px] bg-gray-800 rounded-lg animate-pulse flex items-center justify-center"
              >
                <div className="w-32 h-32 bg-gray-700 rounded-full"></div>
              </div>
            ))
          : selectedAssets.map((symbol) => (
              <ConcentricTicker
                key={symbol}
                symbol={symbol}
                priceData={priceData[symbol]}
                candleData={candleData[symbol]}
                volumeData={volumeData[symbol]}
                isLoading={isLoading}
                getTechnicalIndicators={getTechnicalIndicators}
                getHistoricalPrices={getHistoricalPrices}
              />
            ))}
      </section>

      {/* Show loading state if no assets loaded yet */}
      {selectedAssets.length === 0 && (
        <div className="text-center text-gray-400">
          <p>Loading assets...</p>
        </div>
      )}
    </div>
  )
}
