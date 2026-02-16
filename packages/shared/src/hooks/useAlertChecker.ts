import { useEffect, useRef, useCallback } from 'react'
import {
  getAlerts,
  updateAlert,
  getAudioPreferences,
  LocalAlert,
} from '../lib/localStore'
import { executeAlertTrade } from '../lib/trading/executeAlertTrade'
import { useToast } from './use-toast'

interface PriceData {
  price: number
  change: number
}

/**
 * Background alert checker hook.
 * Runs at the top level of the app, checking all active alerts
 * against live price data on every price update.
 */
export function useAlertChecker(priceData: Record<string, PriceData>) {
  const { toast } = useToast()
  // Track which alerts we've already triggered this session to avoid duplicates
  const triggeredIds = useRef<Set<string>>(new Set())

  const playAudioAlert = useCallback(() => {
    try {
      const prefs = getAudioPreferences()
      if (!prefs.sound_enabled) return

      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AudioContextClass) return

      const audioContext = new AudioContextClass()

      const frequencies: Record<string, number> = {
        chime: 800,
        bell: 1000,
        notification: 600,
        alert: 1200,
        beep: 880,
      }

      const playBeep = (delay: number) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.setValueAtTime(
          frequencies[prefs.sound_type] || 880,
          audioContext.currentTime + delay
        )
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0, audioContext.currentTime + delay)
        gainNode.gain.linearRampToValueAtTime(
          prefs.volume * 0.3,
          audioContext.currentTime + delay + 0.01
        )
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + delay + 0.5
        )

        oscillator.start(audioContext.currentTime + delay)
        oscillator.stop(audioContext.currentTime + delay + 0.5)
      }

      playBeep(0)
      playBeep(0.6)
    } catch (error) {
      console.error('Error playing audio alert:', error)
    }
  }, [])

  const triggerAlert = useCallback(
    async (alert: LocalAlert, currentPrice: number) => {
      if (triggeredIds.current.has(alert.id)) return
      triggeredIds.current.add(alert.id)

      // Update in localStorage
      updateAlert(alert.id, {
        status: 'triggered',
        triggered_at: new Date().toISOString(),
      })

      playAudioAlert()

      const sym = alert.symbol.replace('USDT', '')

      // Build description based on alert type
      let description: string
      if (alert.alert_type === 'trailing_stop') {
        const dir = alert.direction === 'above' ? 'rose above' : 'fell below'
        description = `${sym} ${dir} $${alert.target_price.toFixed(4)}`
      } else if (alert.alert_type === 'percentage_change') {
        description = `${sym} moved ${alert.trailing_percent}%`
      } else {
        const dir = alert.direction === 'above' ? 'above' : 'below'
        description = `${sym} ${dir} $${alert.target_price.toFixed(4)}`
      }

      toast({
        title: 'Price Alert Triggered!',
        description,
        duration: 8000,
      })

      // Execute trade if configured
      if (alert.trade_enabled) {
        const result = await executeAlertTrade(alert)
        if (result?.success) {
          toast({
            title: 'Trade Executed',
            description: `${alert.trade_side} ${alert.trade_quantity} ${sym} @ $${currentPrice.toFixed(2)}`,
            duration: 10000,
          })
        } else if (result) {
          toast({
            title: 'Trade Failed',
            description: result.error,
            variant: 'destructive',
            duration: 10000,
          })
        }
      }
    },
    [toast, playAudioAlert]
  )

  useEffect(() => {
    // No prices yet, nothing to check
    const symbols = Object.keys(priceData)
    if (symbols.length === 0) return

    const activeAlerts = getAlerts().filter((a) => a.status === 'active')
    if (activeAlerts.length === 0) return

    for (const alert of activeAlerts) {
      const data = priceData[alert.symbol]
      if (!data) continue

      const currentPrice = data.price
      if (triggeredIds.current.has(alert.id)) continue

      // --- Price Cross ---
      if (alert.alert_type === 'price_cross') {
        const shouldTrigger =
          alert.direction === 'above'
            ? currentPrice >= alert.target_price
            : currentPrice <= alert.target_price

        if (shouldTrigger) {
          triggerAlert(alert, currentPrice)
        }
        continue
      }

      // --- Percentage Change ---
      if (alert.alert_type === 'percentage_change' && alert.trailing_percent) {
        const changePercent =
          ((currentPrice - alert.target_price) / alert.target_price) * 100
        const shouldTrigger =
          alert.direction === 'above'
            ? changePercent >= alert.trailing_percent
            : changePercent <= -alert.trailing_percent

        if (shouldTrigger) {
          triggerAlert(alert, currentPrice)
        }
        continue
      }

      // --- Trailing Stop ---
      if (alert.alert_type === 'trailing_stop' && alert.trailing_percent) {
        const highWatermark = alert.trailing_high || currentPrice

        if (alert.direction === 'above') {
          // Tracking upward: trigger when price drops from high
          if (currentPrice > highWatermark) {
            // New high — update watermark and trigger price
            const newTrigger = currentPrice * (1 - alert.trailing_percent / 100)
            updateAlert(alert.id, {
              trailing_high: currentPrice,
              target_price: newTrigger,
            })
          } else if (currentPrice <= alert.target_price) {
            triggerAlert(alert, currentPrice)
          }
        } else {
          // Tracking downward: trigger when price rises from low
          const lowWatermark = highWatermark // reuse field as low tracker
          if (currentPrice < lowWatermark) {
            const newTrigger = currentPrice * (1 + alert.trailing_percent / 100)
            updateAlert(alert.id, {
              trailing_high: currentPrice, // store low watermark
              target_price: newTrigger,
            })
          } else if (currentPrice >= alert.target_price) {
            triggerAlert(alert, currentPrice)
          }
        }
      }
    }
  }, [priceData, triggerAlert])
}
