import React, { useState } from 'react'
import { Input } from '@concentric/shared/components/ui/input'
import { Button } from '@concentric/shared/components/ui/button'
import { Badge } from '@concentric/shared/components/ui/badge'
import { X, Plus, Search } from 'lucide-react'
import { ScrollArea } from '@concentric/shared/components/ui/scroll-area'

interface AssetSelectorProps {
  selectedAssets: string[]
  onAssetsChange: (assets: string[]) => void
}

// Popular crypto pairs for quick selection
const POPULAR_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'SOLUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LINKUSDT',
  'LTCUSDT',
  'AVAXUSDT',
  'UNIUSDT',
  'ATOMUSDT',
  'VETUSDT',
  'FILUSDT',
  'TRXUSDT',
  'ETCUSDT',
  'XLMUSDT',
  'ALGOUSDT',
]

export const AssetSelector: React.FC<AssetSelectorProps> = ({ selectedAssets, onAssetsChange }) => {
  const [customSymbol, setCustomSymbol] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPairs = POPULAR_PAIRS.filter((pair) =>
    pair.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addAsset = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase()
    if (!selectedAssets.includes(upperSymbol) && selectedAssets.length < 8) {
      onAssetsChange([...selectedAssets, upperSymbol])
    }
  }

  const removeAsset = (symbol: string) => {
    onAssetsChange(selectedAssets.filter((s) => s !== symbol))
  }

  const addCustomAsset = () => {
    if (customSymbol.trim()) {
      addAsset(customSymbol.trim())
      setCustomSymbol('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Currently Selected */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Selected Assets ({selectedAssets.length}/8)</h3>
        <div className="flex flex-wrap gap-2">
          {selectedAssets.map((asset) => (
            <Badge
              key={asset}
              variant="secondary"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1"
            >
              {asset}
              <button onClick={() => removeAsset(asset)} className="ml-2 hover:text-red-300">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Custom Asset Input */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Add Custom Asset</h3>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., BTCUSDT"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomAsset()}
            className="bg-gray-800 border-gray-700"
          />
          <Button onClick={addCustomAsset} disabled={selectedAssets.length >= 8}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Popular Assets */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Popular Assets</h3>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700"
          />
        </div>
        <ScrollArea className="h-48">
          <div className="grid grid-cols-3 gap-2">
            {filteredPairs.map((pair) => (
              <Button
                key={pair}
                variant="outline"
                size="sm"
                onClick={() => addAsset(pair)}
                disabled={selectedAssets.includes(pair) || selectedAssets.length >= 8}
                className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-xs"
              >
                {pair.replace('USDT', '')}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={() => onAssetsChange(selectedAssets)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Apply Changes
        </Button>
      </div>
    </div>
  )
}
