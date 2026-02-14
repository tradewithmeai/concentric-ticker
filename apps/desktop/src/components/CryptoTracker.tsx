import React, { useState, useEffect } from 'react'
import { AssetSelector } from './AssetSelector'
import { ConcentricTicker } from './ConcentricTicker'
import { EnhancedAlertManager } from './alerts/EnhancedAlertManager'
import { AlertsDisplay } from './alerts/AlertsDisplay'
import { AudioManager } from './audio/AudioManager'
import { useCryptoData } from '@concentric/shared/hooks/useCryptoData'
import { Plus, Settings, Volume2, Bell } from 'lucide-react'
import { Button } from '@concentric/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@concentric/shared/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@concentric/shared/components/ui/tabs'
import { Badge } from '@concentric/shared/components/ui/badge'

export const CryptoTracker = () => {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const {
    priceData,
    candleData,
    volumeData,
    isLoading,
    getTechnicalIndicators,
    getHistoricalPrices,
  } = useCryptoData(selectedAssets)

  // Load saved assets from localStorage on mount
  useEffect(() => {
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
  }, [])

  // Save assets to localStorage whenever they change
  useEffect(() => {
    if (selectedAssets.length > 0) {
      localStorage.setItem('concentric-ticker-assets', JSON.stringify(selectedAssets))
    }
  }, [selectedAssets])

  const handleAssetChange = (assets: string[]) => {
    setSelectedAssets(assets)
    setShowSettings(false)
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex justify-center gap-4">
        {/* Alerts Dialog */}
        <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="bg-gray-800 border-gray-700 hover:bg-gray-700 relative"
            >
              <Bell className="w-4 h-4 mr-2" />
              Alerts
              {alertCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-blue-600 text-white px-1.5 py-0 h-5 min-w-[20px]"
                >
                  {alertCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Alert Management</DialogTitle>
            </DialogHeader>
            <AlertsDisplay onAlertsChange={setAlertCount} />
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crypto Ticker Settings</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="assets" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                <TabsTrigger value="assets" className="data-[state=active]:bg-gray-700">
                  Assets
                </TabsTrigger>
                <TabsTrigger
                  value="audio"
                  className="data-[state=active]:bg-gray-700"
                >
                  <Volume2 className="w-4 h-4 mr-1" />
                  Audio
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:bg-gray-700"
                >
                  Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assets" className="mt-4">
                <AssetSelector selectedAssets={selectedAssets} onAssetsChange={handleAssetChange} />
              </TabsContent>

              <TabsContent value="audio" className="mt-4">
                <AudioManager />
              </TabsContent>

              <TabsContent value="notifications" className="mt-4">
                <div className="text-center py-8 text-gray-400">
                  <p>Notification settings coming soon!</p>
                  <p className="text-sm mt-2">Email, Telegram, and Discord notifications</p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ticker Grid */}
      {selectedAssets.length > 0 ? (
        <div
          className={
            selectedAssets.length === 1
              ? 'flex justify-center items-center min-h-[calc(100vh-200px)]'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6'
          }
        >
          {selectedAssets.map((asset) => (
            <div key={asset} className="space-y-4">
              <ConcentricTicker
                symbol={asset}
                priceData={priceData[asset]}
                candleData={candleData[asset]}
                volumeData={volumeData[asset]}
                isLoading={isLoading}
                getTechnicalIndicators={getTechnicalIndicators}
                getHistoricalPrices={getHistoricalPrices}
              />
              <EnhancedAlertManager symbol={asset} currentPrice={priceData[asset]?.price} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">No assets selected</p>
            <p className="text-sm">Click "Settings" to get started</p>
          </div>
        </div>
      )}
    </div>
  )
}
