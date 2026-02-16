import React, { useState, useEffect } from 'react'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { getStoredKeys } from '../../lib/trading/keyStore'
import type { TradeAlertConfig } from '../../lib/trading/types'

interface TradeToggleProps {
  onChange: (config: TradeAlertConfig | null) => void
}

export const TradeToggle: React.FC<TradeToggleProps> = ({ onChange }) => {
  const [hasKeys] = useState(() => !!getStoredKeys())
  const [enabled, setEnabled] = useState(false)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState('')
  const [accountType, setAccountType] = useState<'SPOT' | 'MARGIN'>('SPOT')

  useEffect(() => {
    if (!enabled) {
      onChange(null)
      return
    }
    onChange({
      trade_enabled: true,
      trade_side: side,
      trade_quantity: quantity,
      trade_account_type: accountType,
    })
  }, [enabled, side, quantity, accountType, onChange])

  if (!hasKeys) return null

  return (
    <div className="space-y-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700">
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          className="data-[state=checked]:bg-blue-600"
        />
        <Label className="text-white text-sm">Auto-trade on trigger</Label>
      </div>

      {enabled && (
        <div className="space-y-2 pl-1">
          <div className="flex gap-2">
            <Select value={side} onValueChange={(v: 'BUY' | 'SELL') => setSide(v)}>
              <SelectTrigger className="w-24 bg-gray-800 border-gray-700 text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="BUY" className="text-green-400">
                  BUY
                </SelectItem>
                <SelectItem value="SELL" className="text-red-400">
                  SELL
                </SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white h-8 text-sm"
              type="number"
              step="any"
              min="0"
            />

            <Select
              value={accountType}
              onValueChange={(v: 'SPOT' | 'MARGIN') => setAccountType(v)}
            >
              <SelectTrigger className="w-28 bg-gray-800 border-gray-700 text-white h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="SPOT" className="text-white">
                  Spot
                </SelectItem>
                <SelectItem value="MARGIN" className="text-white">
                  Margin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
