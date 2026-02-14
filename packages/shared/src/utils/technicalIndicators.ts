export interface BollingerBandsResult {
  upper: number
  middle: number
  lower: number
}

export interface MovingAverages {
  ma7: number
  ma25: number
  ma99: number
}

export interface TechnicalData {
  movingAverages: MovingAverages
  bollingerBands: BollingerBandsResult
}

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0

  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0)
  return sum / period
}

export function calculateStandardDeviation(prices: number[], period: number): number {
  if (prices.length < period) return 0

  const recentPrices = prices.slice(-period)
  const mean = recentPrices.reduce((acc, price) => acc + price, 0) / period
  const variance = recentPrices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period

  return Math.sqrt(variance)
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2.0
): BollingerBandsResult {
  if (prices.length < period) {
    return { upper: 0, middle: 0, lower: 0 }
  }

  const middle = calculateSMA(prices, period)
  const stdDev = calculateStandardDeviation(prices, period)

  return {
    upper: middle + stdDev * multiplier,
    middle,
    lower: middle - stdDev * multiplier,
  }
}

export function calculateAllIndicators(
  prices: number[],
  bollingerLength: number = 20,
  bollingerMultiplier: number = 2.0
): TechnicalData {
  return {
    movingAverages: {
      ma7: calculateSMA(prices, 7),
      ma25: calculateSMA(prices, 25),
      ma99: calculateSMA(prices, 99),
    },
    bollingerBands: calculateBollingerBands(prices, bollingerLength, bollingerMultiplier),
  }
}
