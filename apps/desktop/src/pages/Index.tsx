import React from 'react'
import { MinimalCryptoTracker } from '@/components/MinimalCryptoTracker'
// import { DebugApiTracker } from '@/components/DebugApiTracker'
// import { CryptoTracker } from '@/components/CryptoTracker'
import { AudioManager } from '@/components/audio/AudioManager'

const Index = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-black px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50"
      >
        Skip to content
      </a>

      <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
        <header className="text-center mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1" />
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
                Concentric Ticker
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
                Concentric multi-timeframe visualization with one-click auto alerts for Bollinger
                Bands, moving averages, and intelligent volume monitoring
              </p>
            </div>
            <div className="flex-1 flex justify-end">
            </div>
          </div>
        </header>

        <main id="main-content">
          <h2 className="sr-only">Cryptocurrency Price Tracker</h2>
          <MinimalCryptoTracker />
        </main>
      </div>
    </div>
  )
}

export default Index
