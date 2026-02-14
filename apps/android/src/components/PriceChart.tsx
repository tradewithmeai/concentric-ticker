import React, { useState, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { calculateBollingerBands, calculateSMA } from '@concentric/shared/utils/technicalIndicators'
import { Button } from '@concentric/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@concentric/shared/components/ui/popover'
import { HexColorPicker } from 'react-colorful'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface MovingAverageConfig {
  id: string
  period: number
  enabled: boolean
  color: string
  name: string
}

interface ChartColors {
  price: string
  upperBand: string
  middleBand: string
  lowerBand: string
}

interface PriceChartProps {
  prices: number[]
  symbol: string
  timeframe: string
  bollingerLength: number
  bollingerMultiplier: number
  movingAverages?: MovingAverageConfig[]
  onMAConfigChange?: (configs: MovingAverageConfig[]) => void
  timestamps?: number[] // Add timestamps for proper X-axis display
}

interface ChartDataPoint {
  index: number
  timestamp: number
  price: number
  upperBand: number
  middleBand: number
  lowerBand: number
  [key: string]: number | undefined
}

interface TooltipPayload {
  payload: ChartDataPoint
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string | number
}

export const PriceChart: React.FC<PriceChartProps> = ({
  prices,
  symbol,
  timeframe,
  bollingerLength,
  bollingerMultiplier,
  movingAverages = [],
  onMAConfigChange,
  timestamps = [],
}) => {
  // Simple state declarations
  const [autoScale, setAutoScale] = useState(true)

  // Load saved colors from localStorage or use defaults
  const loadSavedColors = (): ChartColors => {
    try {
      const saved = localStorage.getItem(`price-chart-colors-${symbol}`)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Error loading saved colors:', error)
    }
    return {
      price: '#60A5FA',
      upperBand: '#EF4444',
      middleBand: '#F59E0B',
      lowerBand: '#10B981',
    }
  }

  const [chartColors, setChartColors] = useState<ChartColors>(loadSavedColors)

  // Color picker state
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [selectedLineType, setSelectedLineType] = useState<string>('')
  const [tempColor, setTempColor] = useState<string>('')

  // Click handler to open color picker
  const handleLineClick = useCallback((lineType: string, color: string) => {
    setSelectedLineType(lineType)
    setTempColor(color)
    setColorPickerOpen(true)
  }, [])

  const defaultMAConfigs: MovingAverageConfig[] = [
    { id: 'ma7', period: 7, enabled: false, color: '#10B981', name: 'MA 7' },
    { id: 'ma20', period: 20, enabled: false, color: '#F59E0B', name: 'MA 20' },
    { id: 'ma50', period: 50, enabled: false, color: '#8B5CF6', name: 'MA 50' },
    { id: 'ma100', period: 100, enabled: false, color: '#EC4899', name: 'MA 100' },
    { id: 'ma200', period: 200, enabled: false, color: '#EF4444', name: 'MA 200' },
  ]

  // Load saved MA configs or use defaults
  const loadSavedMAConfigs = (): MovingAverageConfig[] => {
    if (movingAverages.length > 0) return movingAverages

    try {
      const saved = localStorage.getItem(`price-chart-ma-configs-${symbol}`)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Error loading saved MA configs:', error)
    }
    return defaultMAConfigs
  }

  const [localMAConfigs, setLocalMAConfigs] = useState<MovingAverageConfig[]>(loadSavedMAConfigs)

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(6)
    if (price < 100) return price.toFixed(4)
    return price.toFixed(2)
  }

  // Format timestamp based on timeframe
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    switch (timeframe) {
      case '5m':
      case '15m':
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      case '1h':
      case '4h':
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      case '1d':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      default:
        return date.toLocaleDateString()
    }
  }

  // Generate timestamps if not provided
  const generateTimestamps = (length: number): number[] => {
    const now = Date.now()
    const intervals: { [key: string]: number } = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    }

    const interval = intervals[timeframe] || intervals['1h']
    const timestamps: number[] = []

    for (let i = length - 1; i >= 0; i--) {
      timestamps.unshift(now - i * interval)
    }

    return timestamps
  }

  // Calculate chart data
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!prices || prices.length === 0) {
      return []
    }

    const actualTimestamps =
      timestamps.length === prices.length ? timestamps : generateTimestamps(prices.length)

    return prices.map((price, index) => {
      // Calculate Bollinger Bands
      const windowStart = Math.max(0, index - bollingerLength + 1)
      const windowPrices = prices.slice(windowStart, index + 1)

      let bands
      if (windowPrices.length >= Math.min(bollingerLength, 5)) {
        bands = calculateBollingerBands(
          windowPrices,
          Math.min(windowPrices.length, bollingerLength),
          bollingerMultiplier
        )
      } else {
        bands = { upper: price, middle: price, lower: price }
      }

      // Calculate MA values
      const maValues: { [key: string]: number | undefined } = {}
      localMAConfigs.forEach((ma) => {
        if (ma.enabled) {
          const maPricesUpToIndex = prices.slice(0, index + 1)
          if (maPricesUpToIndex.length >= ma.period) {
            maValues[ma.id] = calculateSMA(maPricesUpToIndex, ma.period)
          }
        }
      })

      return {
        index: index + 1,
        timestamp: actualTimestamps[index] || Date.now(),
        price: Number(price) || 0,
        upperBand: Number(bands.upper) || 0,
        middleBand: Number(bands.middle) || 0,
        lowerBand: Number(bands.lower) || 0,
        ...maValues,
      }
    })
  }, [prices, bollingerLength, bollingerMultiplier, localMAConfigs, timestamps, generateTimestamps])

  // Calculate auto-scaling domain for Y-axis
  const yAxisDomain = useMemo(() => {
    if (!autoScale || chartData.length === 0) return ['auto', 'auto']

    let allValues: number[] = []

    chartData.forEach((point) => {
      allValues.push(point.price, point.upperBand, point.middleBand, point.lowerBand)

      // Add enabled MA values
      localMAConfigs.forEach((ma) => {
        if (ma.enabled && point[ma.id] !== undefined) {
          allValues.push(point[ma.id] as number)
        }
      })
    })

    allValues = allValues.filter((val) => val > 0) // Remove invalid values

    if (allValues.length === 0) return ['auto', 'auto']

    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const padding = (max - min) * 0.05 // 5% padding

    return [Math.max(0, min - padding), max + padding]
  }, [chartData, localMAConfigs, autoScale])

  const toggleMA = useCallback(
    (id: string) => {
      const updatedConfigs = localMAConfigs.map((ma) =>
        ma.id === id ? { ...ma, enabled: !ma.enabled } : ma
      )
      setLocalMAConfigs(updatedConfigs)
      if (onMAConfigChange) {
        onMAConfigChange(updatedConfigs)
      }
      // Save to localStorage
      localStorage.setItem(`price-chart-ma-configs-${symbol}`, JSON.stringify(updatedConfigs))
    },
    [localMAConfigs, onMAConfigChange, symbol]
  )

  const updateMAPeriod = useCallback(
    (id: string, period: number) => {
      if (period < 1 || period > 500) return
      const updatedConfigs = localMAConfigs.map((ma) =>
        ma.id === id ? { ...ma, period, name: `MA ${period}` } : ma
      )
      setLocalMAConfigs(updatedConfigs)
      if (onMAConfigChange) {
        onMAConfigChange(updatedConfigs)
      }
      // Save to localStorage
      localStorage.setItem(`price-chart-ma-configs-${symbol}`, JSON.stringify(updatedConfigs))
    },
    [localMAConfigs, onMAConfigChange, symbol]
  )

  // Color update functions
  const handleColorChange = useCallback((newColor: string) => {
    setTempColor(newColor)
  }, [])

  const applyColorChange = useCallback(() => {
    if (selectedLineType && tempColor) {
      // Update chart colors for Bollinger Bands or price
      if (['price', 'upperBand', 'middleBand', 'lowerBand'].includes(selectedLineType)) {
        const newColors = {
          ...chartColors,
          [selectedLineType]: tempColor,
        }
        setChartColors(newColors)
        // Save to localStorage
        localStorage.setItem(`price-chart-colors-${symbol}`, JSON.stringify(newColors))
      }
      // Update MA colors
      else {
        const updatedConfigs = localMAConfigs.map((ma) =>
          ma.id === selectedLineType ? { ...ma, color: tempColor } : ma
        )
        setLocalMAConfigs(updatedConfigs)
        if (onMAConfigChange) {
          onMAConfigChange(updatedConfigs)
        }
        // Save MA configs to localStorage
        localStorage.setItem(`price-chart-ma-configs-${symbol}`, JSON.stringify(updatedConfigs))
      }
    }
    setColorPickerOpen(false)
  }, [selectedLineType, tempColor, localMAConfigs, onMAConfigChange, chartColors, symbol])

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 border border-gray-600 p-3 rounded shadow-lg pointer-events-none">
          <p className="text-gray-300 text-sm mb-2">Period {label}</p>
          <p className="text-white font-semibold">Price: ${formatPrice(data.price)}</p>
          <p className="text-red-400 text-sm">Upper BB: ${formatPrice(data.upperBand)}</p>
          <p className="text-yellow-400 text-sm">Middle BB: ${formatPrice(data.middleBand)}</p>
          <p className="text-green-400 text-sm">Lower BB: ${formatPrice(data.lowerBand)}</p>
          {localMAConfigs
            .filter((ma) => ma.enabled && data[ma.id] !== undefined)
            .map((ma) => (
              <p key={ma.id} className="text-sm" style={{ color: ma.color }}>
                {ma.name}: ${formatPrice(data[ma.id] as number)}
              </p>
            ))}
        </div>
      )
    }
    return null
  }

  if (!prices || prices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No price data available for chart</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border-gray-700 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {symbol.replace('USDT', '')}/{timeframe.toUpperCase()} Price Chart
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={autoScale ? 'default' : 'outline'}
            onClick={() => setAutoScale(!autoScale)}
            className="text-xs"
          >
            Auto Scale
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="timestamp"
            stroke="#9CA3AF"
            fontSize={11}
            tickLine={false}
            tickFormatter={formatTimestamp}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            tickFormatter={formatPrice}
            domain={yAxisDomain}
            scale={autoScale ? 'linear' : 'auto'}
          />

          {/* Bollinger Bands */}
          <Line
            type="monotone"
            dataKey="upperBand"
            stroke={chartColors.upperBand}
            strokeWidth={1.5}
            dot={false}
            name="Upper BB"
            className="cursor-pointer hover:!stroke-2"
            onClick={() => handleLineClick('upperBand', chartColors.upperBand)}
          />
          <Line
            type="monotone"
            dataKey="middleBand"
            stroke={chartColors.middleBand}
            strokeWidth={1.5}
            dot={false}
            name="Middle BB"
            className="cursor-pointer hover:!stroke-2"
            onClick={() => handleLineClick('middleBand', chartColors.middleBand)}
          />
          <Line
            type="monotone"
            dataKey="lowerBand"
            stroke={chartColors.lowerBand}
            strokeWidth={1.5}
            dot={false}
            name="Lower BB"
            className="cursor-pointer hover:!stroke-2"
            onClick={() => handleLineClick('lowerBand', chartColors.lowerBand)}
          />

          {/* Moving Average Lines */}
          {localMAConfigs
            .filter((ma) => ma.enabled)
            .map((ma) => (
              <Line
                key={ma.id}
                type="monotone"
                dataKey={ma.id}
                stroke={ma.color}
                strokeWidth={1.5}
                dot={false}
                name={ma.name}
                connectNulls={false}
                className="cursor-pointer hover:!stroke-2"
                onClick={() => handleLineClick(ma.id, ma.color)}
              />
            ))}

          {/* Price Line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke={chartColors.price}
            strokeWidth={2}
            dot={false}
            name="Price"
            className="cursor-pointer hover:!stroke-[2.5px]"
            onClick={() => handleLineClick('price', chartColors.price)}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Color Picker Popover */}
      <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <PopoverTrigger asChild>
          <div style={{ display: 'none' }} />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 bg-gray-800 border-gray-700">
          <div className="space-y-3">
            <div className="text-sm text-gray-300 font-medium">
              Change{' '}
              {selectedLineType === 'price'
                ? 'Price'
                : selectedLineType === 'upperBand'
                  ? 'Upper BB'
                  : selectedLineType === 'middleBand'
                    ? 'Middle BB'
                    : selectedLineType === 'lowerBand'
                      ? 'Lower BB'
                      : localMAConfigs.find((ma) => ma.id === selectedLineType)?.name ||
                        selectedLineType}{' '}
              Color
            </div>
            <HexColorPicker
              color={tempColor}
              onChange={handleColorChange}
              style={{ width: '200px', height: '120px' }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={applyColorChange}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setColorPickerOpen(false)}
                className="border-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dynamic Legend */}
      <div className="flex justify-center mt-2 space-x-4 text-sm flex-wrap">
        {/* Price Line */}
        <div className="flex items-center">
          <div className="w-3 h-0.5 mr-2" style={{ backgroundColor: chartColors.price }}></div>
          <span className="text-gray-300">Price</span>
        </div>

        {/* Bollinger Bands */}
        <div className="flex items-center">
          <div className="w-3 h-0.5 mr-2" style={{ backgroundColor: chartColors.upperBand }}></div>
          <span className="text-gray-300">Upper BB</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-0.5 mr-2" style={{ backgroundColor: chartColors.middleBand }}></div>
          <span className="text-gray-300">Middle BB</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-0.5 mr-2" style={{ backgroundColor: chartColors.lowerBand }}></div>
          <span className="text-gray-300">Lower BB</span>
        </div>

        {/* Active Moving Averages */}
        {localMAConfigs
          .filter((ma) => ma.enabled)
          .map((ma) => (
            <div key={`legend-${ma.id}`} className="flex items-center">
              <div className="w-3 h-0.5 mr-2" style={{ backgroundColor: ma.color }}></div>
              <span className="text-gray-300">{ma.name}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
