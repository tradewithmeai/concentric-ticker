import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@concentric/shared/components/ui/dialog'
import { Input } from '@concentric/shared/components/ui/input'
import { Label } from '@concentric/shared/components/ui/label'
import { Card } from '@concentric/shared/components/ui/card'
import { Button } from '@concentric/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@concentric/shared/components/ui/popover'
import { TechnicalData, calculateBollingerBands, calculateSMA } from '@concentric/shared/utils/technicalIndicators'
import { PriceChart } from './PriceChart'
import { useToast } from '@concentric/shared/hooks/use-toast'
import { createAlert } from '@concentric/shared/lib/localStore'
import { getStoredKeys } from '@concentric/shared/lib/trading/keyStore'
import { Switch } from '@concentric/shared/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@concentric/shared/components/ui/select'
import { Bell, Plus, X } from 'lucide-react'

interface TechnicalIndicatorsProps {
  isOpen: boolean
  onClose: () => void
  symbol: string
  timeframe: string
  technicalData: TechnicalData | null
  currentPrice: number
  onBollingerConfigChange: (length: number, multiplier: number) => void
  bollingerLength: number
  bollingerMultiplier: number
  historicalPrices?: number[]
}

export const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({
  isOpen,
  onClose,
  symbol,
  timeframe,
  technicalData,
  currentPrice,
  onBollingerConfigChange,
  bollingerLength,
  bollingerMultiplier,
  historicalPrices = [],
}) => {
  const { toast } = useToast()
  const [localLength, setLocalLength] = useState(bollingerLength)
  const [localMultiplier, setLocalMultiplier] = useState(bollingerMultiplier)
  const [isUpdating, setIsUpdating] = useState(false)
  const [creatingAlert, setCreatingAlert] = useState<string | null>(null)
  const [alertsCreated, setAlertsCreated] = useState<Set<string>>(new Set())
  const [hasKeys] = useState(() => !!getStoredKeys())
  const [tradeMode, setTradeMode] = useState(false)
  // Pending trade alert — when trade mode is on, clicking a bell stores details here
  // so the user can configure the trade before confirming
  const [pendingAlert, setPendingAlert] = useState<{
    name: string
    value: number
    side: 'BUY' | 'SELL'
    quantity: string
    accountType: 'SPOT' | 'MARGIN'
  } | null>(null)

  // Default MA configurations - can be moved to props later if needed
  const [movingAverages, setMovingAverages] = useState([
    { id: 'ma7', period: 7, enabled: false, color: '#10B981', name: 'MA 7' },
    { id: 'ma25', period: 25, enabled: false, color: '#F59E0B', name: 'MA 25' },
    { id: 'ma50', period: 50, enabled: false, color: '#8B5CF6', name: 'MA 50' },
    { id: 'ma99', period: 99, enabled: false, color: '#EC4899', name: 'MA 99' },
    { id: 'ma200', period: 200, enabled: false, color: '#EF4444', name: 'MA 200' },
  ])

  const [customMAPeriod, setCustomMAPeriod] = useState('')
  const [showCustomMA, setShowCustomMA] = useState(false)

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(6)
    if (price < 100) return price.toFixed(4)
    return price.toFixed(2)
  }

  const handleConfigChange = () => {
    onBollingerConfigChange(localLength, localMultiplier)
  }

  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle input changes with immediate visual feedback and debounced API calls
  const handleLengthChange = useCallback(
    (value: number) => {
      setLocalLength(value)
      setIsUpdating(true)

      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set new debounced timeout for API call
      debounceTimeoutRef.current = setTimeout(() => {
        onBollingerConfigChange(value, localMultiplier)
        setIsUpdating(false)
      }, 300)
    },
    [localMultiplier, onBollingerConfigChange]
  )

  const handleMultiplierChange = useCallback(
    (value: number) => {
      setLocalMultiplier(value)
      setIsUpdating(true)

      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set new debounced timeout for API call
      debounceTimeoutRef.current = setTimeout(() => {
        onBollingerConfigChange(localLength, value)
        setIsUpdating(false)
      }, 300)
    },
    [localLength, onBollingerConfigChange]
  )

  // Handle Enter key press for immediate update
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfigChange()
    }
  }

  // Handle MA configuration changes
  const handleMAConfigChange = useCallback((configs: typeof movingAverages) => {
    setMovingAverages(configs)
  }, [])

  // Create alert for indicator value
  const createIndicatorAlert = useCallback(
    (indicatorName: string, indicatorValue: number) => {
      // Auto-detect direction: if price is above target, alert when it drops below; vice versa
      const isAbove = currentPrice < indicatorValue
      if (!indicatorValue || indicatorValue === 0) {
        toast({
          title: 'Invalid indicator value',
          description: 'Cannot create alert for invalid indicator value.',
          variant: 'destructive',
        })
        return
      }

      // If trade mode is on, show config form instead of creating immediately
      if (tradeMode) {
        setPendingAlert({
          name: indicatorName,
          value: indicatorValue,
          side: 'BUY',
          quantity: '',
          accountType: 'MARGIN',
        })
        return
      }

      setCreatingAlert(indicatorName)

      try {
        createAlert({
          symbol,
          target_price: indicatorValue,
          direction: isAbove ? 'above' : 'below',
          alert_type: 'price_cross',
        })

        setAlertsCreated((prev) => new Set([...prev, indicatorName]))

        toast({
          title: 'Alert created',
          description: `Price alert set for ${indicatorName} at $${formatPrice(indicatorValue)} (${isAbove ? 'Above' : 'Below'})`,
        })
      } catch (error) {
        console.error('Error creating alert:', error)
        toast({
          title: 'Error',
          description: 'Could not create alert. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setCreatingAlert(null)
      }
    },
    [symbol, toast, tradeMode]
  )

  // Confirm pending trade alert
  const confirmTradeAlert = useCallback(() => {
    if (!pendingAlert || !pendingAlert.quantity) return

    const isAbove = currentPrice < pendingAlert.value

    try {
      createAlert({
        symbol,
        target_price: pendingAlert.value,
        direction: isAbove ? 'above' : 'below',
        alert_type: 'price_cross',
        trade_enabled: true,
        trade_side: pendingAlert.side,
        trade_quantity: pendingAlert.quantity,
        trade_account_type: pendingAlert.accountType,
      })

      setAlertsCreated((prev) => new Set([...prev, pendingAlert.name]))

      toast({
        title: 'Trade alert created',
        description: `${pendingAlert.side} ${pendingAlert.quantity} ${pendingAlert.accountType} when ${pendingAlert.name} hit at $${formatPrice(pendingAlert.value)}`,
      })
    } catch (error) {
      console.error('Error creating trade alert:', error)
      toast({
        title: 'Error',
        description: 'Could not create alert. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setPendingAlert(null)
    }
  }, [pendingAlert, currentPrice, symbol, toast])

  // Helper function to get bell icon styling
  const getBellIconStyle = (indicatorName: string, activeColor: string) => {
    const isCreating = creatingAlert === indicatorName
    const hasAlert = alertsCreated.has(indicatorName)

    return {
      color: isCreating || hasAlert ? activeColor : '#9CA3AF',
      opacity: hasAlert ? 1 : isCreating ? 0.8 : 0.6,
    }
  }

  // Calculate current BB values using local parameters
  const currentBollingerBands = useMemo(() => {
    if (!historicalPrices.length || localLength < 1) {
      return { upper: 0, middle: 0, lower: 0 }
    }
    return calculateBollingerBands(historicalPrices, localLength, localMultiplier)
  }, [historicalPrices, localLength, localMultiplier])

  // Calculate current MA values for enabled MAs
  const currentMAValues = useMemo(() => {
    if (!historicalPrices.length) return {}

    const maValues: { [key: string]: number } = {}
    movingAverages.forEach((ma) => {
      if (ma.enabled && historicalPrices.length >= ma.period) {
        maValues[ma.id] = calculateSMA(historicalPrices, ma.period)
      }
    })
    return maValues
  }, [historicalPrices, movingAverages])

  const getMAPricePosition = (ma: number) => {
    if (!currentPrice || ma === 0) return ''
    const diff = ((currentPrice - ma) / ma) * 100
    const color = diff >= 0 ? 'text-green-500' : 'text-red-500'
    const sign = diff >= 0 ? '+' : ''
    return `${sign}${diff.toFixed(2)}%`
  }

  const getBollingerPosition = () => {
    if (!currentBollingerBands || !currentPrice) return ''
    const { upper, lower, middle } = currentBollingerBands

    if (currentPrice > upper) return 'Above Upper Band'
    if (currentPrice < lower) return 'Below Lower Band'
    if (currentPrice > middle) return 'Above Middle'
    return 'Below Middle'
  }

  const addCustomMA = () => {
    const period = parseInt(customMAPeriod)
    if (period && period > 0 && period <= 500) {
      const customId = `ma${period}`
      // Check if this period already exists
      if (!movingAverages.find((ma) => ma.period === period)) {
        const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#84CC16']
        const usedColors = movingAverages.map((ma) => ma.color)
        const availableColor = colors.find((color) => !usedColors.includes(color)) || '#9CA3AF'

        setMovingAverages((prev) => [
          ...prev,
          {
            id: customId,
            period,
            enabled: true,
            color: availableColor,
            name: `MA ${period}`,
          },
        ])
      } else {
        // Enable existing MA with this period
        setMovingAverages((prev) =>
          prev.map((ma) => (ma.period === period ? { ...ma, enabled: true } : ma))
        )
      }
      setCustomMAPeriod('')
      setShowCustomMA(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Technical Indicators - {symbol.replace('USDT', '')}/{timeframe.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        {!technicalData ? (
          <div className="text-center py-8 text-gray-400">
            <p>Loading technical data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Price Chart with Bollinger Bands */}
            <PriceChart
              prices={historicalPrices}
              symbol={symbol}
              timeframe={timeframe}
              bollingerLength={localLength}
              bollingerMultiplier={localMultiplier}
              movingAverages={movingAverages}
              onMAConfigChange={handleMAConfigChange}
            />
            {/* Trade mode toggle + pending trade config */}
            {hasKeys && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700">
                  <Switch
                    checked={tradeMode}
                    onCheckedChange={setTradeMode}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <span className="text-white text-sm">Auto-trade on alert trigger</span>
                </div>

                {pendingAlert && (
                  <div className="p-3 rounded-lg bg-gray-800 border border-blue-600 space-y-3">
                    <p className="text-sm text-white font-medium">
                      Trade config for <span className="text-blue-400">{pendingAlert.name}</span> at ${formatPrice(pendingAlert.value)}
                    </p>
                    <div className="flex gap-2">
                      <Select
                        value={pendingAlert.side}
                        onValueChange={(v: 'BUY' | 'SELL') =>
                          setPendingAlert((p) => p && { ...p, side: v })
                        }
                      >
                        <SelectTrigger className="w-24 bg-gray-900 border-gray-700 text-white h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="BUY" className="text-green-400">BUY</SelectItem>
                          <SelectItem value="SELL" className="text-red-400">SELL</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Quantity"
                        value={pendingAlert.quantity}
                        onChange={(e) =>
                          setPendingAlert((p) => p && { ...p, quantity: e.target.value })
                        }
                        className="bg-gray-900 border-gray-700 text-white h-8 text-sm"
                        type="number"
                        step="any"
                        min="0"
                        autoFocus
                      />

                      <Select
                        value={pendingAlert.accountType}
                        onValueChange={(v: 'SPOT' | 'MARGIN') =>
                          setPendingAlert((p) => p && { ...p, accountType: v })
                        }
                      >
                        <SelectTrigger className="w-28 bg-gray-900 border-gray-700 text-white h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="SPOT" className="text-white">Spot</SelectItem>
                          <SelectItem value="MARGIN" className="text-white">Margin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmTradeAlert}
                        disabled={!pendingAlert.quantity}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-sm"
                      >
                        Create Alert + Trade
                      </Button>
                      <Button
                        onClick={() => setPendingAlert(null)}
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-300 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Moving Averages */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-yellow-400">Moving Averages</h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add MA
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 bg-gray-800 border-gray-600">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-white mb-2">
                        Select Moving Average:
                      </p>
                      {movingAverages
                        .filter((ma) => !ma.enabled)
                        .map((ma) => (
                          <button
                            key={ma.id}
                            onClick={() => {
                              setMovingAverages((prev) =>
                                prev.map((m) => (m.id === ma.id ? { ...m, enabled: true } : m))
                              )
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded"
                          >
                            {ma.name} ({ma.period} periods)
                          </button>
                        ))}

                      <div className="border-t border-gray-600 pt-2">
                        {!showCustomMA ? (
                          <button
                            onClick={() => setShowCustomMA(true)}
                            className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-700 rounded"
                          >
                            + Custom MA
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              value={customMAPeriod}
                              onChange={(e) => setCustomMAPeriod(e.target.value)}
                              placeholder="Enter period (1-500)"
                              className="h-8 text-sm bg-gray-700 border-gray-600"
                              min="1"
                              max="500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addCustomMA()
                                if (e.key === 'Escape') {
                                  setShowCustomMA(false)
                                  setCustomMAPeriod('')
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={addCustomMA}
                                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                disabled={!customMAPeriod || parseInt(customMAPeriod) <= 0}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowCustomMA(false)
                                  setCustomMAPeriod('')
                                }}
                                className="h-7 text-xs border-gray-600 hover:bg-gray-700"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {movingAverages.filter((ma) => ma.enabled).length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No moving averages selected</p>
                  <p className="text-sm">Click 'Add MA' to add moving averages</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {movingAverages
                    .filter((ma) => ma.enabled)
                    .map((ma) => {
                      const maValue = currentMAValues[ma.id] || 0
                      return (
                        <div key={ma.id} className="text-center relative">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <p className="text-sm text-gray-400">{ma.name}</p>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  createIndicatorAlert(ma.name, maValue)
                                }
                                className={`p-1 hover:bg-gray-700 rounded transition-all ${
                                  creatingAlert === ma.name ? 'animate-pulse' : ''
                                }`}
                                title={
                                  alertsCreated.has(ma.name)
                                    ? `Alert already set for ${ma.name}`
                                    : `Create alert for ${ma.name}`
                                }
                                disabled={!maValue || maValue === 0 || !!creatingAlert}
                              >
                                <Bell
                                  className="w-3 h-3 transition-all"
                                  style={getBellIconStyle(ma.name, ma.color)}
                                />
                              </button>
                              <button
                                onClick={() => {
                                  setMovingAverages((prev) =>
                                    prev.map((m) => (m.id === ma.id ? { ...m, enabled: false } : m))
                                  )
                                }}
                                className="p-1 hover:bg-gray-700 rounded transition-all"
                                title={`Remove ${ma.name}`}
                              >
                                <X className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xl font-bold" style={{ color: ma.color }}>
                            ${formatPrice(maValue)}
                          </p>
                          <p
                            className={`text-sm ${maValue > 0 ? (currentPrice >= maValue ? 'text-green-500' : 'text-red-500') : 'text-gray-500'}`}
                          >
                            {getMAPricePosition(maValue)}
                          </p>
                        </div>
                      )
                    })}
                </div>
              )}
            </Card>

            {/* Bollinger Bands */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-400">Bollinger Bands</h3>
                {isUpdating && (
                  <span className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded animate-pulse">
                    Updating...
                  </span>
                )}
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-900 rounded-lg">
                <div>
                  <Label htmlFor="bb-length" className="text-sm text-gray-400">
                    Length
                  </Label>
                  <Input
                    id="bb-length"
                    type="number"
                    value={localLength}
                    onChange={(e) => handleLengthChange(Number(e.target.value) || 5)}
                    onBlur={handleConfigChange}
                    onKeyPress={handleKeyPress}
                    className="bg-gray-800 border-gray-600 text-white"
                    min="5"
                    max="50"
                  />
                </div>
                <div>
                  <Label htmlFor="bb-multiplier" className="text-sm text-gray-400">
                    Multiplier
                  </Label>
                  <Input
                    id="bb-multiplier"
                    type="number"
                    step="0.1"
                    value={localMultiplier}
                    onChange={(e) => handleMultiplierChange(Number(e.target.value) || 0.5)}
                    onBlur={handleConfigChange}
                    onKeyPress={handleKeyPress}
                    className="bg-gray-800 border-gray-600 text-white"
                    min="0.5"
                    max="5"
                  />
                </div>
              </div>

              {/* Bollinger Band Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-sm text-gray-400">Upper Band</p>
                    <button
                      onClick={() =>
                        createIndicatorAlert(
                          'Bollinger Upper Band',
                          currentBollingerBands.upper
                        )
                      }
                      className={`p-1 hover:bg-gray-700 rounded transition-all ${
                        creatingAlert === 'Bollinger Upper Band' ? 'animate-pulse' : ''
                      }`}
                      title={
                        alertsCreated.has('Bollinger Upper Band')
                          ? 'Alert already set for Upper Band'
                          : 'Create alert for Upper Band breakout'
                      }
                      disabled={
                        !currentBollingerBands.upper ||
                        currentBollingerBands.upper === 0 ||
                        !!creatingAlert
                      }
                    >
                      <Bell
                        className="w-3 h-3 transition-all"
                        style={getBellIconStyle('Bollinger Upper Band', '#EF4444')}
                      />
                    </button>
                  </div>
                  <p className="text-xl font-bold text-red-400">
                    ${formatPrice(currentBollingerBands.upper)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-sm text-gray-400">Middle Band (SMA)</p>
                    <button
                      onClick={() =>
                        createIndicatorAlert(
                          'Bollinger Middle Band',
                          currentBollingerBands.middle
                        )
                      }
                      className={`p-1 hover:bg-gray-700 rounded transition-all ${
                        creatingAlert === 'Bollinger Middle Band' ? 'animate-pulse' : ''
                      }`}
                      title={
                        alertsCreated.has('Bollinger Middle Band')
                          ? 'Alert already set for Middle Band'
                          : 'Create alert for Middle Band cross'
                      }
                      disabled={
                        !currentBollingerBands.middle ||
                        currentBollingerBands.middle === 0 ||
                        !!creatingAlert
                      }
                    >
                      <Bell
                        className="w-3 h-3 transition-all"
                        style={getBellIconStyle('Bollinger Middle Band', '#F59E0B')}
                      />
                    </button>
                  </div>
                  <p className="text-xl font-bold text-yellow-400">
                    ${formatPrice(currentBollingerBands.middle)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <p className="text-sm text-gray-400">Lower Band</p>
                    <button
                      onClick={() =>
                        createIndicatorAlert(
                          'Bollinger Lower Band',
                          currentBollingerBands.lower
                        )
                      }
                      className={`p-1 hover:bg-gray-700 rounded transition-all ${
                        creatingAlert === 'Bollinger Lower Band' ? 'animate-pulse' : ''
                      }`}
                      title={
                        alertsCreated.has('Bollinger Lower Band')
                          ? 'Alert already set for Lower Band'
                          : 'Create alert for Lower Band bounce'
                      }
                      disabled={
                        !currentBollingerBands.lower ||
                        currentBollingerBands.lower === 0 ||
                        !!creatingAlert
                      }
                    >
                      <Bell
                        className="w-3 h-3 transition-all"
                        style={getBellIconStyle('Bollinger Lower Band', '#10B981')}
                      />
                    </button>
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    ${formatPrice(currentBollingerBands.lower)}
                  </p>
                </div>
              </div>

              {/* Current Position */}
              <div className="mt-4 p-3 bg-gray-900 rounded-lg text-center">
                <p className="text-sm text-gray-400">Current Position</p>
                <p className="text-lg font-semibold text-white">{getBollingerPosition()}</p>
              </div>
            </Card>

            {/* Current Price Reference */}
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="text-center">
                <p className="text-sm text-gray-400">Current Price</p>
                <p className="text-2xl font-bold text-white">${formatPrice(currentPrice)}</p>
                <p className="text-sm text-gray-500 mt-1">Timeframe: {timeframe.toUpperCase()}</p>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
