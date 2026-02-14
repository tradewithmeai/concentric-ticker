import React, { useState, useEffect } from 'react';
import { Card } from '@concentric/shared/components/ui/card';
import { Skeleton } from '@concentric/shared/components/ui/skeleton';
import { TechnicalIndicators } from './TechnicalIndicators';
import { TechnicalData } from '@concentric/shared/utils/technicalIndicators';

interface PriceData {
  price: number;
  change: number;
}

interface CandleData {
  '5m': 'green' | 'red' | 'gray';
  '15m': 'green' | 'red' | 'gray';
  '1h': 'green' | 'red' | 'gray';
  '4h': 'green' | 'red' | 'gray';
  '1d': 'green' | 'red' | 'gray';
}

interface VolumeData {
  '5m': { current: number; percentage: number };
  '15m': { current: number; percentage: number };
  '1h': { current: number; percentage: number };
  '4h': { current: number; percentage: number };
  '1d': { current: number; percentage: number };
}

interface ConcentricTickerProps {
  symbol: string;
  priceData?: PriceData;
  candleData?: CandleData;
  volumeData?: VolumeData;
  isLoading: boolean;
  getTechnicalIndicators?: (symbol: string, timeframe: string, bollingerLength?: number, bollingerMultiplier?: number) => TechnicalData | null;
}

export const ConcentricTicker: React.FC<ConcentricTickerProps> = ({
  symbol,
  priceData,
  candleData,
  volumeData,
  isLoading,
  getTechnicalIndicators,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [bollingerLength, setBollingerLength] = useState(20);
  const [bollingerMultiplier, setBollingerMultiplier] = useState(2.0);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second for progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeframeProgress = (timeframe: string): number => {
    const now = new Date(currentTime);
    
    switch (timeframe) {
      case '5m':
        return (now.getMinutes() % 5) / 5 + now.getSeconds() / (5 * 60);
      case '15m':
        return (now.getMinutes() % 15) / 15 + now.getSeconds() / (15 * 60);
      case '1h':
        return now.getMinutes() / 60 + now.getSeconds() / 3600;
      case '4h':
        return (now.getHours() % 4) / 4 + now.getMinutes() / (4 * 60) + now.getSeconds() / (4 * 3600);
      case '1d':
        return now.getHours() / 24 + now.getMinutes() / (24 * 60) + now.getSeconds() / (24 * 3600);
      default:
        return 0;
    }
  };

  const formatPrice = (price: number) => {
    if (price < 1) return price.toFixed(6);
    if (price < 100) return price.toFixed(4);
    return price.toFixed(2);
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500 hover:bg-green-600';
      case 'red': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handleTimeframeClick = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    if (getTechnicalIndicators) {
      const data = getTechnicalIndicators(symbol, timeframe, bollingerLength, bollingerMultiplier);
      setTechnicalData(data);
    }
  };

  const handleBollingerConfigChange = (length: number, multiplier: number) => {
    setBollingerLength(length);
    setBollingerMultiplier(multiplier);
    if (selectedTimeframe && getTechnicalIndicators) {
      const data = getTechnicalIndicators(symbol, selectedTimeframe, length, multiplier);
      setTechnicalData(data);
    }
  };

  const timeframes = ['1d', '4h', '1h', '15m', '5m']; // Order from outermost to innermost for correct labeling
  
  const getVolumePercentage = (timeframe: string): number => {
    if (!volumeData) return 0;
    const volumeInfo = volumeData[timeframe as keyof VolumeData];
    if (!volumeInfo || !volumeInfo.percentage) return 0;
    
    // Return the actual percentage directly, capped at 200% for visual scaling
    return Math.min(volumeInfo.percentage, 200);
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-700 p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-20 bg-gray-700" />
          <Skeleton className="h-64 w-full bg-gray-700 rounded-full" />
          <Skeleton className="h-8 w-32 bg-gray-700" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-900 border-gray-700 p-6 hover:bg-gray-800 transition-colors">
        <div className="text-center space-y-4">
          {/* Symbol */}
          <h3 className="text-xl font-bold text-white">
            {symbol.replace('USDT', '')}
            <span className="text-gray-400 text-sm ml-1">/USDT</span>
          </h3>

          {/* Concentric circles display with three-section design */}
          <div className="relative w-96 h-96 mx-auto flex items-center justify-center">
            {/* Outermost to innermost circles */}
            {timeframes.map((tf, index) => {
              const progress = getTimeframeProgress(tf);
              const progressPercent = Math.min(progress * 100, 100);
              const volumePercentage = getVolumePercentage(tf);
              const baseColor = candleData?.[tf as keyof CandleData] || 'gray';
              
              // Calculate size for each ring (index 0 = outermost, index 4 = innermost)
              const size = 320 - (index * 50); // 320px for 1d, 270px for 4h, ..., 120px for 5m
              const radius = size / 2;
              const strokeWidth = 16; // Increased stroke width for better visibility
              
              const getColor = (color: string) => {
                switch (color) {
                  case 'green': return '#10b981';
                  case 'red': return '#ef4444';
                  default: return '#6b7280';
                }
              };

              // Calculate arc paths for SVG segments
              const centerX = radius;
              const centerY = radius;
              const arcRadius = radius - strokeWidth / 2;
              
              // Top half (180° arc) - from left to right across the top
              const topHalfPath = `M ${centerX - arcRadius} ${centerY} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + arcRadius} ${centerY}`;
              
              // Bottom left quarter - Volume indicator (6 o'clock to 9 o'clock clockwise)
              const volumePercent = volumePercentage / 200; // Max 200% volume = full quarter
              let volumePath = '';
              let volumePathHigh = '';
              let midPointPath = '';
              
              // Always show 100% midpoint marker (white line at 45 degrees between 6 and 9 o'clock)
              const midAngle = 135; // 135 degrees (halfway between 90° and 180°)
              const midX = centerX + arcRadius * Math.cos(midAngle * Math.PI / 180);
              const midY = centerY + arcRadius * Math.sin(midAngle * Math.PI / 180);
              const midOuterX = centerX + (arcRadius + strokeWidth/2) * Math.cos(midAngle * Math.PI / 180);
              const midOuterY = centerY + (arcRadius + strokeWidth/2) * Math.sin(midAngle * Math.PI / 180);
              const midInnerX = centerX + (arcRadius - strokeWidth/2) * Math.cos(midAngle * Math.PI / 180);
              const midInnerY = centerY + (arcRadius - strokeWidth/2) * Math.sin(midAngle * Math.PI / 180);
              midPointPath = `M ${midInnerX} ${midInnerY} L ${midOuterX} ${midOuterY}`;
              
              if (volumePercent > 0) {
                if (volumePercentage <= 100) {
                  // Blue arc for 0-100% volume (6 o'clock clockwise toward midpoint)
                  const volumeAngle = (volumePercentage / 100) * 45; // 0 to 45 degrees
                  const startAngle = 90; // 6 o'clock
                  const actualEndAngle = startAngle + volumeAngle; // Go clockwise (increase angle)
                  
                  const startX = centerX + arcRadius * Math.cos(startAngle * Math.PI / 180);
                  const startY = centerY + arcRadius * Math.sin(startAngle * Math.PI / 180);
                  const endX = centerX + arcRadius * Math.cos(actualEndAngle * Math.PI / 180);
                  const endY = centerY + arcRadius * Math.sin(actualEndAngle * Math.PI / 180);
                  
                  volumePath = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
                } else {
                  // Blue arc to midpoint + purple arc for 100-200% volume
                  // Blue arc (6 o'clock to midpoint)
                  const startAngle = 90; // 6 o'clock
                  const midAngle = 135; // midpoint
                  
                  const startX = centerX + arcRadius * Math.cos(startAngle * Math.PI / 180);
                  const startY = centerY + arcRadius * Math.sin(startAngle * Math.PI / 180);
                  const midX = centerX + arcRadius * Math.cos(midAngle * Math.PI / 180);
                  const midY = centerY + arcRadius * Math.sin(midAngle * Math.PI / 180);
                  
                  volumePath = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${midX} ${midY}`;
                  
                  // Purple arc (midpoint toward 9 o'clock)
                  const highVolumeAngle = ((volumePercentage - 100) / 100) * 45; // 0 to 45 degrees
                  const endAngle = midAngle + highVolumeAngle; // Go clockwise from midpoint
                  
                  const endX = centerX + arcRadius * Math.cos(endAngle * Math.PI / 180);
                  const endY = centerY + arcRadius * Math.sin(endAngle * Math.PI / 180);
                  
                  volumePathHigh = `M ${midX} ${midY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
                }
              }
              
              // Bottom right quarter - Time progress (3 o'clock to 6 o'clock)  
              const timePercent = progressPercent / 100; // 0 to 1
              let progressPath = '';
              if (timePercent > 0 && timePercent <= 1) {
                const timeAngle = timePercent * 90; // 0 to 90 degrees
                const startAngle = 0; // 3 o'clock (right)
                const endAngle = 90; // 6 o'clock (bottom)
                const actualEndAngle = startAngle + timeAngle; // Fill clockwise from 3 toward 6
                
                const startX = centerX + arcRadius * Math.cos(startAngle * Math.PI / 180);
                const startY = centerY + arcRadius * Math.sin(startAngle * Math.PI / 180);
                const endX = centerX + arcRadius * Math.cos(actualEndAngle * Math.PI / 180);
                const endY = centerY + arcRadius * Math.sin(actualEndAngle * Math.PI / 180);
                
                const largeArc = timeAngle <= 90 ? 0 : 1;
                progressPath = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${endX} ${endY}`;
              }
              
              return (
                <div key={tf} className="absolute">
                  {/* SVG for the three-section circle */}
                  <svg 
                    width={size} 
                    height={size} 
                    className="absolute"
                    style={{
                      left: `${-radius}px`,
                      top: `${-radius}px`,
                    }}
                  >
                    {/* Background circle */}
                    <circle
                      cx={radius}
                      cy={radius}
                      r={arcRadius}
                      fill="none"
                      stroke="rgba(107, 114, 128, 0.3)"
                      strokeWidth={strokeWidth}
                    />
                    
                    {/* Top half - Candle color */}
                    <path
                      d={topHalfPath}
                      fill="none"
                      stroke={getColor(baseColor)}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                    />
                    
                    {/* Bottom left quarter - Volume indicator */}
                    {/* Blue volume arc (0-100%) */}
                    {volumePath && (
                      <path
                        d={volumePath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        opacity="0.8"
                      />
                    )}
                    
                    {/* Purple volume arc (100-200%) */}
                    {volumePathHigh && (
                      <path
                        d={volumePathHigh}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        opacity="0.8"
                      />
                    )}
                    
                    {/* White 100% midpoint marker */}
                    {midPointPath && (
                      <path
                        d={midPointPath}
                        stroke="white"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                    )}
                    
                    {/* Bottom right quarter - Time progress */}
                    {progressPath && (
                      <path
                        d={progressPath}
                        fill="none"
                        stroke="#eab308"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        opacity="0.8"
                      />
                    )}
                  </svg>

                  {/* Click handler overlay - circular */}
                  <button
                    onClick={() => handleTimeframeClick(tf)}
                    className="absolute hover:bg-white/10 transition-colors duration-200"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      borderRadius: '50%',
                      left: `${-radius}px`,
                      top: `${-radius}px`,
                    }}
                    disabled={!candleData || !getTechnicalIndicators}
                  />
                  
                  {/* Timeframe label positioned at the top */}
                  <div 
                    className="absolute"
                    style={{
                      top: `${-radius - 8}px`,
                      left: '0px',
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                    }}
                  >
                    <span 
                      className="text-white font-bold text-sm px-2 py-1 rounded shadow-lg"
                      style={{
                        backgroundColor: getColor(baseColor),
                        fontSize: `${16 - index}px`,
                      }}
                    >
                      {tf}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Price in the absolute center */}
            {priceData && (
              <div className="relative z-10 text-center bg-gray-900/95 rounded-lg p-3 border-2 border-white shadow-lg">
                <div className="text-xl font-bold text-white">
                  ${formatPrice(priceData.price)}
                </div>
                <div className={`text-xs ${priceData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="text-xs text-gray-400 text-center mt-4">
            <p>Click timeframe to view technical indicators</p>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Volume 0-100%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Volume 100-200%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Time Progress</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Technical Indicators Modal */}
      <TechnicalIndicators
        isOpen={!!selectedTimeframe}
        onClose={() => setSelectedTimeframe(null)}
        symbol={symbol}
        timeframe={selectedTimeframe || ''}
        technicalData={technicalData}
        currentPrice={priceData?.price || 0}
        onBollingerConfigChange={handleBollingerConfigChange}
        bollingerLength={bollingerLength}
        bollingerMultiplier={bollingerMultiplier}
      />
    </>
  );
};
