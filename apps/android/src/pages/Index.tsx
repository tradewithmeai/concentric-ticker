import { MinimalCryptoTracker } from '@/components/MinimalCryptoTracker'

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black safe-area-inset">
      <div className="container mx-auto px-3 py-4 min-h-screen overflow-y-auto">
        <header className="text-center mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-1">
            Concentric Ticker
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Multi-timeframe visualization with one-click auto alerts
          </p>
        </header>

        <main id="main-content">
          <MinimalCryptoTracker />
        </main>
      </div>
    </div>
  )
}

export default Index
