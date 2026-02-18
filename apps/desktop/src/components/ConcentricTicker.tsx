import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  lazy,
  startTransition,
} from 'react'
import { Card } from '@concentric/shared/components/ui/card'
import { Skeleton } from '@concentric/shared/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@concentric/shared/components/ui/tooltip'
import { TechnicalData } from '@concentric/shared/utils/technicalIndicators'
import { useIdleMount } from '@concentric/shared/hooks/useIdleMount'
import { isDebug } from '@concentric/shared/lib/debug'

// Lazy load heavy components that are only shown on demand
const TechnicalIndicators = lazy(() =>
  import('./TechnicalIndicators').then((m) => ({ default: m.TechnicalIndicators }))
)

interface PriceData {
  price: number
  change: number
}

interface CandleData {
  '5m': 'green' | 'red' | 'gray'
  '15m': 'green' | 'red' | 'gray'
  '1h': 'green' | 'red' | 'gray'
  '4h': 'green' | 'red' | 'gray'
  '1d': 'green' | 'red' | 'gray'
}

interface VolumeData {
  '5m': { current: number; percentage: number }
  '15m': { current: number; percentage: number }
  '1h': { current: number; percentage: number }
  '4h': { current: number; percentage: number }
  '1d': { current: number; percentage: number }
}

interface ConcentricTickerProps {
  symbol: string
  priceData?: PriceData
  candleData?: CandleData
  volumeData?: VolumeData
  isLoading: boolean
  getTechnicalIndicators?: (
    symbol: string,
    timeframe: string,
    bollingerLength?: number,
    bollingerMultiplier?: number
  ) => TechnicalData | null
  getHistoricalPrices?: (symbol: string, timeframe: string) => number[]
}

export const ConcentricTicker = React.memo<ConcentricTickerProps>(
  ({
    symbol,
    priceData,
    candleData,
    volumeData,
    isLoading,
    getTechnicalIndicators,
    getHistoricalPrices,
  }) => {
    const isIdleMounted = useIdleMount()
    const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null)
    const [bollingerLength, setBollingerLength] = useState(20)
    const [bollingerMultiplier, setBollingerMultiplier] = useState(2.0)
    const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null)
    const [currentTime, setCurrentTime] = useState(() => Date.now())
    const [previousPrice, setPreviousPrice] = useState<number | null>(null)
    const [lastPriceDirection, setLastPriceDirection] = useState<'up' | 'down'>('up')
    // Debug mode is completely controlled by build environment - no state needed
    const debugMode = isDebug()
    const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null)

    // Update time every second for progress animation
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)
      return () => clearInterval(interval)
    }, [])

    // Track price changes for tick direction
    useEffect(() => {
      if (priceData && priceData.price !== undefined) {
        if (previousPrice !== null && priceData.price !== previousPrice) {
          if (priceData.price > previousPrice) {
            setLastPriceDirection('up')
          } else if (priceData.price < previousPrice) {
            setLastPriceDirection('down')
          }
          // No timeout needed - keep the last direction permanently
        }
        setPreviousPrice(priceData.price)
      }
    }, [priceData?.price, priceData, previousPrice])

    // Debug mode keyboard shortcut removed - debug mode is now immutable based on build environment

    const getTimeframeProgress = useCallback(
      (timeframe: string): number => {
        const now = new Date(currentTime)

        switch (timeframe) {
          case '5m':
            return (now.getMinutes() % 5) / 5 + now.getSeconds() / (5 * 60)
          case '15m':
            return (now.getMinutes() % 15) / 15 + now.getSeconds() / (15 * 60)
          case '1h':
            return now.getMinutes() / 60 + now.getSeconds() / 3600
          case '4h':
            return (
              (now.getHours() % 4) / 4 + now.getMinutes() / (4 * 60) + now.getSeconds() / (4 * 3600)
            )
          case '1d':
            return (
              now.getHours() / 24 + now.getMinutes() / (24 * 60) + now.getSeconds() / (24 * 3600)
            )
          default:
            return 0
        }
      },
      [currentTime]
    )

    const formatPrice = useCallback((price: number) => {
      if (price < 1) return price.toFixed(6)
      if (price < 100) return price.toFixed(4)
      return price.toFixed(2)
    }, [])

    const getColorClass = useCallback((color: string) => {
      switch (color) {
        case 'green':
          return 'bg-green-500 hover:bg-green-600'
        case 'red':
          return 'bg-red-500 hover:bg-red-600'
        default:
          return 'bg-gray-500 hover:bg-gray-600'
      }
    }, [])

    // Shared color function to avoid hoisting conflicts
    const getColor = useCallback((color: string) => {
      switch (color) {
        case 'green':
          return '#1f6f3f' // Soft green
        case 'red':
          return '#8b2e36' // Soft red
        default:
          return '#6b7280'
      }
    }, [])

    const handleTimeframeClick = useCallback(
      (timeframe: string) => {
        console.log(`Timeframe clicked: ${timeframe} for symbol: ${symbol}`)
        setSelectedTimeframe(timeframe)
        if (getTechnicalIndicators) {
          startTransition(() => {
            const data = getTechnicalIndicators(
              symbol,
              timeframe,
              bollingerLength,
              bollingerMultiplier
            )
            setTechnicalData(data)
          })
        }
      },
      [getTechnicalIndicators, symbol, bollingerLength, bollingerMultiplier]
    )

    const handleBollingerConfigChange = (length: number, multiplier: number) => {
      setBollingerLength(length)
      setBollingerMultiplier(multiplier)
      if (selectedTimeframe && getTechnicalIndicators) {
        startTransition(() => {
          const data = getTechnicalIndicators(symbol, selectedTimeframe, length, multiplier)
          setTechnicalData(data)
        })
      }
    }

    const timeframes = ['1d', '4h', '1h', '15m', '5m'] // All timeframes - debugging single asset with all rings

    // Memoize expensive size calculations
    const minCircleSize = useMemo(() => {
      return Math.min(...timeframes.map((_, index) => 280 - index * 45))
    }, [timeframes])

    const centerCircleDimensions = useMemo(
      () => ({
        width: minCircleSize * 0.6 - 6,
        height: minCircleSize * 0.6 - 6,
        fontSize: {
          symbol: minCircleSize * 0.08,
          price: minCircleSize * 0.09,
        },
      }),
      [minCircleSize]
    )

    const getVolumePercentage = useCallback(
      (timeframe: string): number => {
        if (!volumeData) return 0
        const volumeInfo = volumeData[timeframe as keyof VolumeData]
        if (!volumeInfo || !volumeInfo.percentage) return 0

        // Return the actual percentage directly, capped at 200% for visual scaling
        return Math.min(volumeInfo.percentage, 200)
      },
      [volumeData]
    )

    // Memoize expensive SVG path calculations
    const getSvgPathData = useCallback((index: number, volumePercentage: number) => {
      const baseSize = 280 - index * 45
      const radius = baseSize / 2
      const topStrokeWidth = 20
      const quarterStrokeWidth = 10
      const centerX = radius
      const centerY = radius
      const topArcRadius = radius - topStrokeWidth / 2
      const quarterArcRadius = topArcRadius

      // Volume calculations
      const volumeStartAngle = 180
      const volumeTotalRange = 180
      const volumeClampedPercentage = Math.min(volumePercentage, 200)
      const volumeCurrentAngle =
        volumeStartAngle + (volumeClampedPercentage / 200) * volumeTotalRange

      const volumeStartX = centerX + quarterArcRadius * Math.cos((volumeStartAngle * Math.PI) / 180)
      const volumeStartY = centerY + quarterArcRadius * Math.sin((volumeStartAngle * Math.PI) / 180)
      const volumeEndX = centerX + quarterArcRadius * Math.cos((volumeCurrentAngle * Math.PI) / 180)
      const volumeEndY = centerY + quarterArcRadius * Math.sin((volumeCurrentAngle * Math.PI) / 180)

      const volumeLargeArcFlag = volumeCurrentAngle - volumeStartAngle > 180 ? 1 : 0
      const volume100Angle = 270
      const midPointX = centerX + quarterArcRadius * Math.cos((volume100Angle * Math.PI) / 180)
      const midPointY = centerY + quarterArcRadius * Math.sin((volume100Angle * Math.PI) / 180)

      return {
        topHalfPath: `M ${centerX - topArcRadius} ${centerY} A ${topArcRadius} ${topArcRadius} 0 0 1 ${centerX + topArcRadius} ${centerY}`,
        volumePath:
          volumePercentage > 0
            ? `M ${volumeStartX} ${volumeStartY} A ${quarterArcRadius} ${quarterArcRadius} 0 ${volumeLargeArcFlag} 1 ${volumeEndX} ${volumeEndY}`
            : null,
        midPointPath: `M ${midPointX - 3} ${midPointY} L ${midPointX + 3} ${midPointY}`,
        midPointX,
        midPointY,
        size: baseSize,
        topStrokeWidth,
        quarterStrokeWidth,
        topArcRadius,
      }
    }, [])

    if (isLoading || !isIdleMounted) {
      return (
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-20 bg-gray-700" />
            <Skeleton className="h-64 w-full bg-gray-700 rounded-full" />
            <Skeleton className="h-8 w-32 bg-gray-700" />
          </div>
        </Card>
      )
    }

    return (
      <>
        <Card className="bg-gray-900 border-gray-700 p-3 hover:bg-gray-800 transition-colors w-fit mx-auto">
          <div className="flex flex-col items-center">
            {/* Concentric circles display with three-section design - DOUBLED SIZE */}
            <div className="relative">
              <TooltipProvider>
                <div className="relative w-[280px] h-[167px]">
                  {/* Render from outermost to innermost for visuals, but process clicks from innermost to outermost */}
                  {timeframes.map((tf, index) => {
                    const progress = getTimeframeProgress(tf)
                    const progressPercent = Math.min(progress * 100, 100)
                    const volumePercentage = getVolumePercentage(tf)
                    const baseColor = candleData?.[tf as keyof CandleData] || 'gray'

                    // Use memoized SVG path calculations
                    const pathData = getSvgPathData(index, volumePercentage)
                    const {
                      topHalfPath,
                      volumePath,
                      midPointPath,
                      midPointX,
                      midPointY,
                      size,
                      topStrokeWidth,
                      quarterStrokeWidth,
                      topArcRadius,
                    } = pathData

                    // Enhanced volume color logic with 200%+ flashing alert
                    const volumeColor =
                      volumePercentage < 100
                        ? '#555555'
                        : volumePercentage >= 200
                          ? '#FF6B6B'
                          : '#777777'
                    const volumeGlow =
                      volumePercentage >= 100
                        ? 'drop-shadow(0 0 6px rgba(119, 119, 119, 0.3))'
                        : 'none'
                    const volumeFlashing = volumePercentage >= 200
                    const flashingStyle = volumeFlashing ? 'animate-pulse' : ''

                    return (
                      <div
                        key={tf}
                        className="absolute"
                        style={{
                          left: '50%',
                          top: '85%',
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        {/* SVG for the three-section circle */}
                        <svg
                          width={size}
                          height={size}
                          className="absolute"
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {/* BACKGROUND: Top half - Candle color - THICK STROKE */}
                          <path
                            d={topHalfPath}
                            fill="none"
                            stroke={getColor(baseColor)}
                            strokeWidth={topStrokeWidth}
                            strokeLinecap="round"
                            opacity="0.6"
                          />

                          {/* FOREGROUND: Volume indicator in bottom-left - THIN STROKE */}
                          {/* Single continuous volume arc - 2-color system */}
                          {volumePath && (
                            <path
                              d={volumePath}
                              fill="none"
                              stroke={volumeColor}
                              strokeWidth={quarterStrokeWidth}
                              strokeLinecap="round"
                              opacity={volumeFlashing ? '0.9' : '0.6'}
                              className={flashingStyle}
                              style={{
                                filter: volumeGlow,
                                transition: 'stroke 200ms ease-in, filter 200ms ease-in',
                                animationDuration: volumeFlashing ? '1s' : undefined,
                              }}
                            />
                          )}

                          {/* Clickable lightning bolt at 100% volume mark */}
                          <foreignObject x={midPointX - 12} y={midPointY - 12} width="24" height="24">
                            <button
                              onClick={() => handleTimeframeClick(tf)}
                              className="w-6 h-6 bg-transparent border-none cursor-pointer hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded flex items-center justify-center transition-transform"
                              style={{ fontSize: '14px', lineHeight: 1 }}
                              aria-label={`Open technical analysis for ${symbol} ${tf} timeframe`}
                              title={`View technical indicators for ${tf} timeframe`}
                            >
                              ⚡
                            </button>
                          </foreignObject>
                        </svg>

                        {/* Timeframe label at bottom left */}
                        <div
                          className="absolute z-[20] flex items-center justify-center font-semibold"
                          style={{
                            fontSize: '8px',
                            color: '#f8f8f8',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                            // Position at bottom left of the semicircle (9 o'clock position) - properly centered
                            left: `calc(50% - ${topArcRadius}px)`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {tf}
                        </div>
                      </div>
                    )
                  })}

                  {/* Price and symbol in the absolute center */}
                  {(() => {
                    // Use the shared color function for perfect consistency
                    return priceData ? (
                      <div
                        className="absolute z-10 flex flex-col items-center justify-center rounded-full font-bold text-white shadow-lg transition-colors duration-150"
                        style={{
                          width: `${centerCircleDimensions.width}px`,
                          height: `${centerCircleDimensions.height}px`,
                          left: '50%',
                          top: 'calc(120% - 58px)',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: getColor(lastPriceDirection === 'up' ? 'green' : 'red'),
                        }}
                      >
                        <div
                          style={{
                            fontSize: `${centerCircleDimensions.fontSize.symbol}px`,
                            opacity: 0.9,
                          }}
                        >
                          {symbol.replace('USDT', '')}
                        </div>
                        <div
                          style={{
                            fontSize: `${centerCircleDimensions.fontSize.price}px`,
                          }}
                        >
                          ${formatPrice(priceData.price)}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="absolute z-10 flex flex-col items-center justify-center rounded-full font-bold text-white shadow-lg transition-colors duration-150"
                        style={{
                          width: `${centerCircleDimensions.width}px`,
                          height: `${centerCircleDimensions.height}px`,
                          left: '50%',
                          top: 'calc(120% - 58px)',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: '#6b7280',
                        }}
                      >
                        <div
                          style={{
                            fontSize: `${centerCircleDimensions.fontSize.symbol}px`,
                            opacity: 0.9,
                          }}
                        >
                          {symbol.replace('USDT', '')}
                        </div>
                        <div
                          style={{
                            fontSize: `${centerCircleDimensions.fontSize.price}px`,
                          }}
                        >
                          Loading...
                        </div>
                      </div>
                    )
                  })()}

                  {/* Mouse Coordinates Display - COMPLETELY DISABLED */}
                  {false && hoverCoords && (
                    <div
                      className="absolute bg-black/80 text-yellow-400 px-2 py-1 rounded text-xs font-mono pointer-events-none z-[20] border border-yellow-500"
                      style={{
                        left: `${hoverCoords.x + 10}px`,
                        top: `${hoverCoords.y - 30}px`,
                      }}
                    >
                      X: {hoverCoords.x}px, Y: {hoverCoords.y}px
                      <br />
                      Center: {Math.abs(hoverCoords.x - 320)}px, {Math.abs(hoverCoords.y - 320)}px
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </div>

            {/* Simple instruction text */}
            <div className="text-xs text-gray-400 text-center mt-1">
              <p>Click the ⚡ lightning bolt for instant technical alerts and analysis</p>
              {/* DEBUG MODE COMPLETELY DISABLED */}
              {false && (
                <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-600">
                  <p className="text-red-400 font-bold">🔧 DEBUG MODE ACTIVE</p>
                  <p className="text-xs">
                    Press Ctrl+D to toggle • Grid shows hover areas and measurements
                  </p>
                </div>
              )}
            </div>

            {/* Developer Tools Panel - COMPLETELY DISABLED */}
            {false && (
              <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-600 text-left">
                <h4 className="text-yellow-400 font-bold mb-3">🛠️ Developer Tools</h4>

                {/* Circle Measurements */}
                <div className="mb-4">
                  <h5 className="text-blue-400 font-semibold mb-2">Circle Measurements</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {timeframes.map((tf, index) => {
                      const size = 280 - index * 45
                      const radius = size / 2
                      return (
                        <div key={tf} className="bg-gray-700 p-2 rounded">
                          <span className="text-white font-bold">{tf}:</span> {size}px
                          <br />
                          <span className="text-gray-300">Radius: {radius}px</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Current State */}
                <div className="mb-4">
                  <h5 className="text-green-400 font-semibold mb-2">Current State</h5>
                  <div className="text-xs bg-gray-700 p-2 rounded">
                    <div>Price: ${priceData ? formatPrice(priceData.price) : 'Loading...'}</div>
                    <div>
                      Direction:{' '}
                      <span
                        className={lastPriceDirection === 'up' ? 'text-green-400' : 'text-red-400'}
                      >
                        {lastPriceDirection.toUpperCase()}
                      </span>
                    </div>
                    <div>Container: 800px max-width (doubled from 400px)</div>
                    <div>Display Area: 640×640px (doubled from 320×320px)</div>
                    <div>Top Stroke Width: 56px (candle direction)</div>
                    <div>Quarter Stroke Width: 28px (volume & time)</div>
                    <div>Center Price: 112×112px (doubled from 56×56px)</div>
                  </div>
                </div>

                {/* Positioning Values */}
                <div className="mb-4">
                  <h5 className="text-purple-400 font-semibold mb-2">Export Values</h5>
                  <div className="text-xs bg-gray-700 p-2 rounded font-mono">
                    <div>Base Size: 560px (280px × 2)</div>
                    <div>Size Decrement: 90px (45px × 2)</div>
                    <div>Stroke Width: 56px (14px × 4)</div>
                    <div>Center Price: 112px (56px × 2)</div>
                    <div>Card Max Width: 800px (400px × 2)</div>
                    <div>Display Area: 640×640px (320×320px × 2)</div>
                    <div>Scale Factor: 2x everything</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h5 className="text-red-400 font-semibold mb-2">Quick Actions</h5>
                  <div className="flex gap-2">
                    <button
                      onClick={() => console.log('Timeframes:', timeframes)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Log Timeframes
                    </button>
                    <button
                      onClick={() =>
                        console.log(
                          'Sizes:',
                          timeframes.map((tf, i) => ({ tf, size: 280 - i * 45 }))
                        )
                      }
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Log Sizes
                    </button>
                    <button
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          JSON.stringify({
                            baseSize: '560px (280px × 2)',
                            decrement: '90px (45px × 2)',
                            strokeWidth: '56px (14px × 4)',
                            centerPrice: '112px (56px × 2)',
                            containerWidth: '800px (400px × 2)',
                            displayArea: '640×640px (320×320px × 2)',
                            scaleFactor: '2x everything',
                            stage: 'Stage 2 - Complete 2x scaling',
                          })
                        )
                      }
                      className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      Copy Config
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Technical Indicators Modal */}
        {selectedTimeframe && (
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="text-white">Loading analysis...</div>
              </div>
            }
          >
            <TechnicalIndicators
              isOpen={!!selectedTimeframe}
              onClose={() => setSelectedTimeframe(null)}
              symbol={symbol}
              timeframe={selectedTimeframe}
              technicalData={technicalData}
              currentPrice={priceData?.price || 0}
              onBollingerConfigChange={handleBollingerConfigChange}
              bollingerLength={bollingerLength}
              bollingerMultiplier={bollingerMultiplier}
              historicalPrices={
                getHistoricalPrices ? getHistoricalPrices(symbol, selectedTimeframe) : []
              }
            />
          </Suspense>
        )}
      </>
    )
  }
)
