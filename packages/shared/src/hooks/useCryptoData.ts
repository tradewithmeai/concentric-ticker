import { useState, useEffect, useCallback } from 'react'
import { calculateAllIndicators, TechnicalData } from '../utils/technicalIndicators'
import { BinanceKlineResponse, isBinanceKlineResponse, BinanceTickerResponse } from '../lib/types'
import { fetchTickerData, fetchKlineData, ApiError } from '../lib/data/binance'
import { setError, clearError, useRetryToken, setInFlight } from '../state/appStore'
import { log, error } from '../lib/logger'

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

interface HistoricalData {
  prices: number[]
}

export const useCryptoData = (symbols: string[]) => {
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({})
  const [candleData, setCandleData] = useState<Record<string, CandleData>>({})
  const [volumeData, setVolumeData] = useState<Record<string, VolumeData>>({})
  const [historicalData, setHistoricalData] = useState<
    Record<string, Record<string, HistoricalData>>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const retryToken = useRetryToken()

  const fetchPriceData = useCallback(async () => {
    if (symbols.length === 0) return

    setInFlight(true)
    try {
      // Fetch 24h ticker data for all symbols
      const tickerPromises = symbols.map((symbol) => fetchTickerData(symbol))

      const tickerResults = await Promise.allSettled(tickerPromises)
      const newPriceData: Record<string, PriceData> = {}

      tickerResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const ticker = result.value
          newPriceData[symbols[index]] = {
            price: parseFloat(ticker.lastPrice),
            change: parseFloat(ticker.priceChangePercent),
          }
        } else {
          error(`Error fetching ${symbols[index]}:`, result.reason)
        }
      })

      setPriceData(newPriceData)
      clearError() // Clear any previous errors on success
    } catch (error) {
      error('Error fetching price data:', error)
      if (error instanceof ApiError) {
        if (error.code === 'RATE_LIMITED') {
          setError({
            message: error.message,
            code: error.status || 429,
            retryAfterSec: error.retryAfterSec,
          })
        } else {
          setError({
            message: `Could not fetch price data: ${error.message}`,
            code: error.code,
          })
        }
      } else {
        setError({
          message: 'Could not fetch price data. Please check your connection and try again.',
          code: 'UNKNOWN_ERROR',
        })
      }
    } finally {
      setInFlight(false)
    }
  }, [symbols])

  const fetchCandleAndVolumeData = useCallback(async () => {
    if (symbols.length === 0) return

    const timeframes = ['5m', '15m', '1h', '4h', '1d']
    const newCandleData: Record<string, CandleData> = {}
    const newVolumeData: Record<string, VolumeData> = {}

    for (const symbol of symbols) {
      const candleColors: Partial<CandleData> = {}
      const volumes: Partial<VolumeData> = {}

      for (const interval of timeframes) {
        try {
          const data = await fetchKlineData(symbol, interval, 2)

          if (data.length >= 1) {
            const currentCandle = data[data.length - 1]
            const previousCandle = data.length >= 2 ? data[data.length - 2] : null

            const [, open, , , close, volume] = currentCandle
            const openPrice = parseFloat(String(open))
            const closePrice = parseFloat(String(close))
            const currentVolume = parseFloat(String(volume))

            candleColors[interval as keyof CandleData] = closePrice >= openPrice ? 'green' : 'red'

            // Calculate volume percentage relative to previous period
            let volumePercentage = 100
            if (previousCandle) {
              const previousVolume = parseFloat(String(previousCandle[5]))
              volumePercentage = previousVolume > 0 ? (currentVolume / previousVolume) * 100 : 100
            }

            volumes[interval as keyof VolumeData] = {
              current: currentVolume,
              percentage: volumePercentage,
            }
          } else {
            candleColors[interval as keyof CandleData] = 'gray'
            volumes[interval as keyof VolumeData] = { current: 0, percentage: 100 }
          }
        } catch (error) {
          error(`Error fetching ${interval} candle for ${symbol}:`, error)
          candleColors[interval as keyof CandleData] = 'gray'
          volumes[interval as keyof VolumeData] = { current: 0, percentage: 100 }
        }
      }

      newCandleData[symbol] = candleColors as CandleData
      newVolumeData[symbol] = volumes as VolumeData
    }

    setCandleData(newCandleData)
    setVolumeData(newVolumeData)
    setIsLoading(false)
  }, [symbols])

  const fetchHistoricalData = useCallback(async () => {
    if (symbols.length === 0) return

    const timeframes = ['5m', '15m', '1h', '4h', '1d']
    const newHistoricalData: Record<string, Record<string, HistoricalData>> = {}

    for (const symbol of symbols) {
      newHistoricalData[symbol] = {}

      for (const interval of timeframes) {
        try {
          // Fetch 100 periods for indicator calculations
          const data = await fetchKlineData(symbol, interval, 100)
          const prices = data.map((kline: BinanceKlineResponse) => parseFloat(kline[4] as string))
          newHistoricalData[symbol][interval] = { prices }
        } catch (error) {
          error(`Error fetching historical data for ${symbol} ${interval}:`, error)
          newHistoricalData[symbol][interval] = { prices: [] }
        }
      }
    }

    setHistoricalData(newHistoricalData)
  }, [symbols])

  useEffect(() => {
    if (symbols.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Initial fetch for candles and historical data
    fetchCandleAndVolumeData()
    fetchHistoricalData()

    // WebSocket connection for real-time prices
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbols.map((s) => s.toLowerCase() + '@ticker').join('/')}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      log('WebSocket connected for real-time price updates')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle individual ticker updates
        if (data.s && data.c && data.P) {
          setPriceData((prev) => ({
            ...prev,
            [data.s]: {
              price: parseFloat(data.c),
              change: parseFloat(data.P),
            },
          }))
        }
      } catch (error) {
        error('Error parsing WebSocket data:', error)
      }
    }

    ws.onerror = (error) => {
      error('WebSocket error:', error)
      // Fallback to polling if WebSocket fails
      const priceInterval = setInterval(fetchPriceData, 1000)
      return () => clearInterval(priceInterval)
    }

    ws.onclose = () => {
      log('WebSocket connection closed')
    }

    // Set up intervals for financial data - every 500ms as requested
    const candleInterval = setInterval(fetchCandleAndVolumeData, 500) // 500ms for candles and volume
    const historicalInterval = setInterval(fetchHistoricalData, 30000) // 30 seconds for historical data

    return () => {
      ws.close()
      clearInterval(candleInterval)
      clearInterval(historicalInterval)
    }
  }, [symbols, fetchPriceData, fetchCandleAndVolumeData, fetchHistoricalData, retryToken])

  const getTechnicalIndicators = useCallback(
    (
      symbol: string,
      timeframe: string,
      bollingerLength: number = 20,
      bollingerMultiplier: number = 2.0
    ): TechnicalData | null => {
      const data = historicalData[symbol]?.[timeframe]
      log(
        `getTechnicalIndicators: symbol=${symbol}, timeframe=${timeframe}, data available:`,
        !!data,
        'prices count:',
        data?.prices.length || 0
      )
      log('Available timeframes for symbol:', Object.keys(historicalData[symbol] || {}))
      if (!data || data.prices.length === 0) return null

      return calculateAllIndicators(data.prices, bollingerLength, bollingerMultiplier)
    },
    [historicalData]
  )

  const getHistoricalPrices = useCallback(
    (symbol: string, timeframe: string): number[] => {
      const data = historicalData[symbol]?.[timeframe]
      return data?.prices || []
    },
    [historicalData]
  )

  return {
    priceData,
    candleData,
    volumeData,
    historicalData,
    isLoading,
    getTechnicalIndicators,
    getHistoricalPrices,
  }
}
