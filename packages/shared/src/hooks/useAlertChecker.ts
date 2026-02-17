import { useEffect, useRef, useCallback, useState } from 'react'
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

interface ActiveAlarm {
  alertId: string
  description: string
}

/**
 * Background alert checker hook.
 * Runs at the top level of the app, checking all active alerts
 * against live price data on every price update.
 *
 * Returns { activeAlarm, silence } for persistent alarm UI.
 */
export function useAlertChecker(priceData: Record<string, PriceData>) {
  const { toast } = useToast()
  const triggeredIds = useRef<Set<string>>(new Set())
  const loopInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null)

  // Stop any looping sound
  const silence = useCallback(() => {
    if (loopInterval.current) {
      clearInterval(loopInterval.current)
      loopInterval.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setActiveAlarm(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopInterval.current) clearInterval(loopInterval.current)
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
    }
  }, [])

  const playAlarmPattern = useCallback(() => {
    try {
      const prefs = getAudioPreferences()
      if (!prefs.sound_enabled) return

      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AudioContextClass) return

      // Reuse or create audio context
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextClass()
      }
      const ctx = audioCtxRef.current

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const frequencies: Record<string, number> = {
        chime: 800,
        bell: 1000,
        notification: 600,
        alert: 1200,
        beep: 880,
      }

      const vol = prefs.volume

      const playBeep = (delay: number, freq: number) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + delay)
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
        gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.8)

        oscillator.start(ctx.currentTime + delay)
        oscillator.stop(ctx.currentTime + delay + 0.8)
      }

      const baseFreq = frequencies[prefs.sound_type] || 880
      playBeep(0, baseFreq)
      playBeep(0.5, baseFreq * 1.25)
      playBeep(1.0, baseFreq * 1.5)
    } catch (err) {
      console.error('Error playing audio alert:', err)
    }
  }, [])

  const startPersistentAlarm = useCallback(
    (description: string, alertId: string) => {
      // Stop any existing alarm first
      if (loopInterval.current) {
        clearInterval(loopInterval.current)
      }

      setActiveAlarm({ alertId, description })

      // Play immediately, then repeat every 3 seconds
      playAlarmPattern()
      loopInterval.current = setInterval(() => {
        playAlarmPattern()
      }, 3000)
    },
    [playAlarmPattern]
  )

  const triggerAlert = useCallback(
    async (alert: LocalAlert, currentPrice: number) => {
      if (triggeredIds.current.has(alert.id)) return
      triggeredIds.current.add(alert.id)

      // Update in localStorage
      updateAlert(alert.id, {
        status: 'triggered',
        triggered_at: new Date().toISOString(),
      })

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

      // Play sound — persistent or one-shot
      const prefs = getAudioPreferences()
      if (prefs.persistent) {
        startPersistentAlarm(description, alert.id)
      } else {
        playAlarmPattern()
      }

      toast({
        title: 'Price Alert Triggered!',
        description,
        duration: prefs.persistent ? Infinity : 8000,
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
    [toast, playAlarmPattern, startPersistentAlarm]
  )

  useEffect(() => {
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
          if (currentPrice > highWatermark) {
            const newTrigger = currentPrice * (1 - alert.trailing_percent / 100)
            updateAlert(alert.id, {
              trailing_high: currentPrice,
              target_price: newTrigger,
            })
          } else if (currentPrice <= alert.target_price) {
            triggerAlert(alert, currentPrice)
          }
        } else {
          const lowWatermark = highWatermark
          if (currentPrice < lowWatermark) {
            const newTrigger = currentPrice * (1 + alert.trailing_percent / 100)
            updateAlert(alert.id, {
              trailing_high: currentPrice,
              target_price: newTrigger,
            })
          } else if (currentPrice >= alert.target_price) {
            triggerAlert(alert, currentPrice)
          }
        }
      }
    }
  }, [priceData, triggerAlert])

  return { activeAlarm, silence }
}
