import React, { useState, useCallback } from 'react'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Button } from './ui/button'
import { Volume2, VolumeX } from 'lucide-react'
import {
  getAudioPreferences,
  saveAudioPreferences,
  AudioPreferences,
} from '../lib/localStore'

export const AlertSoundSettings: React.FC = () => {
  const [prefs, setPrefs] = useState<AudioPreferences>(getAudioPreferences)

  const update = useCallback((patch: Partial<AudioPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      saveAudioPreferences(next)
      return next
    })
  }, [])

  const testSound = useCallback(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const frequencies: Record<string, number> = {
      chime: 800,
      bell: 1000,
      notification: 600,
      alert: 1200,
      beep: 880,
    }
    const baseFreq = frequencies[prefs.sound_type] || 880

    const playBeep = (delay: number, freq: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(prefs.volume, ctx.currentTime + delay + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.8)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.8)
    }

    playBeep(0, baseFreq)
    playBeep(0.5, baseFreq * 1.25)
    playBeep(1.0, baseFreq * 1.5)
  }, [prefs])

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-white">Alert Sound</h4>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-300">Sound enabled</Label>
        <Switch
          checked={prefs.sound_enabled}
          onCheckedChange={(v) => update({ sound_enabled: v })}
        />
      </div>

      {prefs.sound_enabled && (
        <>
          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-300">
                {prefs.volume > 0 ? (
                  <Volume2 className="w-4 h-4 inline mr-1" />
                ) : (
                  <VolumeX className="w-4 h-4 inline mr-1" />
                )}
                Volume: {Math.round(prefs.volume * 100)}%
              </Label>
            </div>
            <Slider
              value={[prefs.volume * 100]}
              onValueChange={([v]) => update({ volume: v / 100 })}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Sound type */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">Sound type</Label>
            <Select
              value={prefs.sound_type}
              onValueChange={(v) => update({ sound_type: v })}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="bell" className="text-white">Bell</SelectItem>
                <SelectItem value="chime" className="text-white">Chime</SelectItem>
                <SelectItem value="alert" className="text-white">Alert</SelectItem>
                <SelectItem value="beep" className="text-white">Beep</SelectItem>
                <SelectItem value="notification" className="text-white">Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Persistent mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-gray-300">Persistent alarm</Label>
              <p className="text-xs text-gray-500">Loops until you silence it</p>
            </div>
            <Switch
              checked={prefs.persistent}
              onCheckedChange={(v) => update({ persistent: v })}
            />
          </div>

          {/* Test button */}
          <Button
            onClick={testSound}
            variant="outline"
            size="sm"
            className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Test Sound
          </Button>
        </>
      )}
    </div>
  )
}
