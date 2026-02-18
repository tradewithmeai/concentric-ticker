import React, { useState } from 'react'
import { Button } from './ui/button'
import {
  Bell,
  BarChart3,
  RefreshCw,
  Settings,
  Zap,
  ChevronRight,
  ChevronLeft,
  Shield,
  Rocket,
  CircleDot,
} from 'lucide-react'

const ONBOARDING_KEY = 'concentric-onboarding-complete'

interface OnboardingTutorialProps {
  onComplete: () => void
}

interface OnboardingStep {
  icon: React.ReactNode
  iconBg: string
  title: string
  content: React.ReactNode
}

function buildSteps(): OnboardingStep[] {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return [
    // 0 — Welcome
    {
      icon: <CircleDot className="w-7 h-7 text-emerald-400" />,
      iconBg: 'bg-emerald-600/20',
      title: 'Welcome to Concentric Ticker',
      content: (
        <p>
          Real-time cryptocurrency tracking with multi-timeframe analysis,
          automated price alerts, Binance trading, and dollar-cost averaging
          strategies — all in one app.
        </p>
      ),
    },

    // 1 — Ticker & Lightning Bolt
    {
      icon: <Zap className="w-7 h-7 text-yellow-400" />,
      iconBg: 'bg-yellow-600/20',
      title: 'Live Price Tickers',
      content: (
        <div className="space-y-2">
          <p>
            Each concentric circle represents a different timeframe (5m, 15m,
            1h, 4h, 1d). Green means bullish, red means bearish. The arc
            thickness shows trading volume.
          </p>
          <p>
            Tap the <span className="text-yellow-400">⚡ lightning bolt</span>{' '}
            on any timeframe ring for instant technical analysis — RSI,
            Bollinger Bands, moving averages, and one-click alert creation.
          </p>
        </div>
      ),
    },

    // 2 — Alerts
    {
      icon: <Bell className="w-7 h-7 text-blue-400" />,
      iconBg: 'bg-blue-600/20',
      title: 'Price Alerts',
      content: (
        <div className="space-y-2">
          <p>
            Set alerts that trigger when an asset crosses your target price.
            Create them from the technical analysis panel or the{' '}
            <span className="text-blue-400 font-medium">Alerts</span> button.
          </p>
          <p>
            Enable <span className="text-white font-medium">persistent alarm</span>{' '}
            in Settings to keep the alarm sounding until you dismiss it.
          </p>
        </div>
      ),
    },

    // 3 — Trading (with API key instructions)
    {
      icon: <BarChart3 className="w-7 h-7 text-green-400" />,
      iconBg: 'bg-green-600/20',
      title: 'Binance Trading',
      content: (
        <div className="space-y-3">
          <p>
            Connect your Binance account to execute trades directly from the
            app when alerts trigger.
          </p>

          <div className="space-y-1.5">
            <p className="text-white font-medium text-xs uppercase tracking-wide">
              Create your API key:
            </p>
            <ol className="space-y-1 text-gray-300 list-none">
              {isMobile ? (
                <>
                  <li>1. Open the <strong className="text-white">Binance app</strong> and switch to <strong className="text-yellow-400">Pro mode</strong></li>
                  <li>2. Tap the <strong className="text-white">☰ menu</strong> (top-left corner)</li>
                  <li>3. Tap <strong className="text-white">More Services</strong></li>
                  <li>4. Search for <strong className="text-white">"API"</strong> and select <strong className="text-white">API Management</strong></li>
                  <li>5. Tap <strong className="text-white">Create API</strong> → <strong className="text-white">System Generated</strong></li>
                  <li>6. Name it <strong className="text-white">"Concentric Ticker"</strong> and complete 2FA</li>
                  <li>7. Enable <strong className="text-yellow-400">Spot & Margin Trading</strong></li>
                  <li>8. Copy the <strong className="text-white">API Key</strong> and <strong className="text-white">Secret Key</strong></li>
                </>
              ) : (
                <>
                  <li>1. Go to <strong className="text-white">binance.com</strong> and log in</li>
                  <li>2. Navigate to <strong className="text-white">Account → API Management</strong></li>
                  <li>3. Click <strong className="text-white">Create API</strong> → <strong className="text-white">System Generated</strong></li>
                  <li>4. Name it <strong className="text-white">"Concentric Ticker"</strong> and complete 2FA</li>
                  <li>5. Enable <strong className="text-yellow-400">Spot & Margin Trading</strong></li>
                  <li>6. Copy the <strong className="text-white">API Key</strong> and <strong className="text-white">Secret Key</strong></li>
                </>
              )}
            </ol>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-900/30 border border-blue-700/50">
            <p className="text-xs text-blue-300">
              <Shield className="w-3.5 h-3.5 inline mr-1 align-text-bottom" />
              Tap the <strong>Trading</strong> button to paste your keys. They
              are stored locally on your device only — never sent to any
              third-party server.
            </p>
          </div>
        </div>
      ),
    },

    // 4 — DCA
    {
      icon: <RefreshCw className="w-7 h-7 text-purple-400" />,
      iconBg: 'bg-purple-600/20',
      title: 'DCA Strategies',
      content: (
        <div className="space-y-2">
          <p>
            Set up automated dollar-cost averaging to buy or sell crypto at
            regular intervals — hourly, daily, or weekly.
          </p>
          <p>
            Configure the asset, amount per period, and total budget. DCA
            requires Binance API keys — set those up in{' '}
            <span className="text-green-400 font-medium">Trading</span> first.
          </p>
          <p className="text-gray-400 text-xs">
            Strategies execute while the app is open or running in the
            background.
          </p>
        </div>
      ),
    },

    // 5 — Settings
    {
      icon: <Settings className="w-7 h-7 text-gray-300" />,
      iconBg: 'bg-gray-600/20',
      title: 'Settings',
      content: (
        <div className="space-y-2">
          <p>
            Choose which cryptocurrency pairs to track — any USDT pair
            available on Binance.
          </p>
          <p>
            Configure alert sounds, volume level, and persistent alarm mode.
            Your preferences are saved automatically.
          </p>
        </div>
      ),
    },

    // 6 — Done
    {
      icon: <Rocket className="w-7 h-7 text-orange-400" />,
      iconBg: 'bg-orange-600/20',
      title: "You're All Set!",
      content: (
        <div className="space-y-2">
          <p>
            Start by exploring the price tickers. Tap a{' '}
            <span className="text-yellow-400">⚡ lightning bolt</span> for
            instant technical analysis and one-click alerts.
          </p>
          <p>
            When you're ready to trade, open the{' '}
            <span className="text-green-400 font-medium">Trading</span> button
            and connect your Binance API keys.
          </p>
        </div>
      ),
    },
  ]
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [steps] = useState(() => buildSteps())

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    onComplete()
  }

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    onComplete()
  }

  const step = steps[currentIndex]
  const isLast = currentIndex === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 text-sm"
        >
          Skip
        </button>

        {/* Step content */}
        <div className="space-y-4 pt-2">
          {/* Icon */}
          <div
            className={`mx-auto w-14 h-14 rounded-full ${step.iconBg} flex items-center justify-center`}
          >
            {step.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center">
            {step.title}
          </h2>

          {/* Content */}
          <div className="text-sm text-gray-300 text-left">
            {step.content}
          </div>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? 'w-8 bg-blue-500'
                  : 'w-3 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((i) => i - 1)}
              className="border-gray-700 text-gray-300"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            onClick={
              isLast
                ? handleComplete
                : () => setCurrentIndex((i) => i + 1)
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
