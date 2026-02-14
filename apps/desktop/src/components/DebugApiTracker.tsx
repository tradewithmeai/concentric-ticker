import React, { useState } from 'react'
import { useCryptoData } from '@concentric/shared/hooks/useCryptoData'
import { ConcentricTicker } from './ConcentricTicker'

export const DebugApiTracker = () => {
  const [selectedAssets] = useState<string[]>(['BTCUSDT'])
  const {
    priceData,
    candleData,
    volumeData,
    isLoading,
    getTechnicalIndicators,
    getHistoricalPrices,
  } = useCryptoData(selectedAssets)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Loading...</h2>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center">
        <ConcentricTicker
          symbol="BTCUSDT"
          priceData={priceData['BTCUSDT']}
          candleData={candleData['BTCUSDT']}
          volumeData={volumeData['BTCUSDT']}
          isLoading={false}
          getTechnicalIndicators={getTechnicalIndicators}
          getHistoricalPrices={getHistoricalPrices}
        />
      </div>
    </div>
  )
}
