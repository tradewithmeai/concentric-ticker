
import React, { useState, useEffect } from 'react';
import { AssetSelector } from './AssetSelector';
import { ConcentricTicker } from './ConcentricTicker';
import { EnhancedAlertManager } from './alerts/EnhancedAlertManager';
import { AudioManager } from './audio/AudioManager';
import { useCryptoData } from '@concentric/shared/hooks/useCryptoData';
import { Plus, Settings, Volume2, X, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@concentric/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@concentric/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@concentric/shared/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

export const CryptoTracker = () => {
  const { user } = useAuth();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAppBanner, setShowAppBanner] = useState(() =>
    localStorage.getItem('concentric-app-banner-dismissed') !== 'true'
  );
  const { priceData, candleData, volumeData, isLoading, getTechnicalIndicators } = useCryptoData(selectedAssets);

  // Load saved assets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('concentric-ticker-assets');
    if (saved) {
      try {
        const assets = JSON.parse(saved);
        setSelectedAssets(assets);
      } catch (error) {
        console.error('Error loading saved assets:', error);
      }
    } else {
      // Default assets for first-time users
      setSelectedAssets(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT']);
    }
  }, []);

  // Save assets to localStorage whenever they change
  useEffect(() => {
    if (selectedAssets.length > 0) {
      localStorage.setItem('concentric-ticker-assets', JSON.stringify(selectedAssets));
    }
  }, [selectedAssets]);

  const handleAssetChange = (assets: string[]) => {
    setSelectedAssets(assets);
    setShowSettings(false);
  };

  const dismissBanner = () => {
    setShowAppBanner(false);
    localStorage.setItem('concentric-app-banner-dismissed', 'true');
  };

  return (
    <div className="space-y-8">
      {/* App promotion banner */}
      {showAppBanner && (
        <div className="relative bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-300">
            <Monitor className="w-4 h-4 flex-shrink-0" />
            <Smartphone className="w-4 h-4 flex-shrink-0" />
          </div>
          <p className="text-sm text-gray-300 flex-1">
            Trading and DCA features are available on our{' '}
            <span className="text-blue-400 font-medium">desktop</span> and{' '}
            <span className="text-blue-400 font-medium">mobile</span> apps for the best experience.
          </p>
          <button
            onClick={dismissBanner}
            className="text-gray-500 hover:text-gray-300 p-1 flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
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
                <TabsTrigger value="audio" className="data-[state=active]:bg-gray-700" disabled={!user}>
                  <Volume2 className="w-4 h-4 mr-1" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-gray-700" disabled={!user}>
                  Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assets" className="mt-4">
                <AssetSelector
                  selectedAssets={selectedAssets}
                  onAssetsChange={handleAssetChange}
                />
              </TabsContent>

              <TabsContent value="audio" className="mt-4">
                {user ? (
                  <AudioManager />
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>Sign in to configure audio alerts</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="mt-4">
                {user ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>Notification settings coming soon!</p>
                    <p className="text-sm mt-2">Email, Telegram, and Discord notifications</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>Sign in to configure notifications</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ticker Grid */}
      {selectedAssets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {selectedAssets.map((asset) => (
            <div key={asset} className="space-y-4">
              <ConcentricTicker
                symbol={asset}
                priceData={priceData[asset]}
                candleData={candleData[asset]}
                volumeData={volumeData[asset]}
                isLoading={isLoading}
                getTechnicalIndicators={getTechnicalIndicators}
              />
              <EnhancedAlertManager 
                symbol={asset} 
                currentPrice={priceData[asset]?.price} 
              />
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
  );
};
