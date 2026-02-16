import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react'
import { saveKeys, clearKeys, getStoredKeys } from '../../lib/trading/keyStore'
import { createTradingClient } from '../../lib/trading/binanceTrading'
import { createWebCryptoSigner } from '../../lib/trading/sign'

interface ApiKeyWizardProps {
  onComplete: () => void
  onDisconnect?: () => void
}

type Step = 'welcome' | 'instructions' | 'enter-keys' | 'connected'

export const ApiKeyWizard: React.FC<ApiKeyWizardProps> = ({ onComplete, onDisconnect }) => {
  const existingKeys = getStoredKeys()
  const [step, setStep] = useState<Step>(existingKeys ? 'connected' : 'welcome')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  const maskedKey = existingKeys
    ? existingKeys.apiKey.slice(0, 8) + '...' + existingKeys.apiKey.slice(-4)
    : ''

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setTestResult('error')
      setTestError('Please enter both API Key and Secret')
      return
    }

    setTesting(true)
    setTestResult('idle')
    setTestError('')

    try {
      const signer = createWebCryptoSigner(apiSecret.trim())
      const client = createTradingClient(apiKey.trim(), signer)
      await client.syncTime()
      await client.getAccountBalances()

      saveKeys({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim() })
      setTestResult('success')
    } catch (err) {
      setTestResult('error')
      setTestError((err as Error).message)
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = () => {
    clearKeys()
    setApiKey('')
    setApiSecret('')
    setTestResult('idle')
    setStep('welcome')
    onDisconnect?.()
  }

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1 mb-2">
        {(['welcome', 'instructions', 'enter-keys', 'connected'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              s === step ? 'w-8 bg-blue-500' : 'w-4 bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Step: Welcome */}
      {step === 'welcome' && (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Key className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Connect Binance</h3>
            <p className="text-sm text-gray-400 mt-2">
              Link your Binance account to place limit orders when alerts trigger.
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-left">
            <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-300">
              Your keys are stored locally on this device and only sent directly to Binance's API.
              They never pass through any third-party server.
            </p>
          </div>
          <Button
            onClick={() => setStep('instructions')}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step: Instructions */}
      {step === 'instructions' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Create an API Key</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                1
              </span>
              <span className="text-gray-300">
                Log in to Binance and go to{' '}
                <strong className="text-white">Account &rarr; API Management</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                2
              </span>
              <span className="text-gray-300">
                Click <strong className="text-white">"Create API"</strong> and choose{' '}
                <strong className="text-white">"System generated"</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                3
              </span>
              <span className="text-gray-300">
                Name it (e.g. "Concentric Ticker") and complete 2FA verification
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                4
              </span>
              <span className="text-gray-300">
                Enable{' '}
                <strong className="text-yellow-400">"Spot & Margin Trading"</strong>{' '}
                permission
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                5
              </span>
              <span className="text-gray-300">
                Optionally restrict access to your IP address for extra security
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                6
              </span>
              <span className="text-gray-300">
                Copy the <strong className="text-white">API Key</strong> and{' '}
                <strong className="text-white">Secret Key</strong>
              </span>
            </li>
          </ol>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('welcome')}
              className="border-gray-700 text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={() => setStep('enter-keys')}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              I have my keys
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Enter Keys */}
      {step === 'enter-keys' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Enter Your API Keys</h3>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setTestResult('idle')
                  }}
                  placeholder="Enter your API key"
                  className="bg-gray-800 border-gray-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">API Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => {
                    setApiSecret(e.target.value)
                    setTestResult('idle')
                  }}
                  placeholder="Enter your API secret"
                  className="bg-gray-800 border-gray-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Test result */}
          {testResult === 'success' && (
            <div className="flex items-center gap-2 p-2 rounded bg-green-900/30 border border-green-800">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">Connection successful</span>
            </div>
          )}
          {testResult === 'error' && (
            <div className="flex items-start gap-2 p-2 rounded bg-red-900/30 border border-red-800">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span className="text-sm text-red-300 break-all">{testError}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('instructions')}
              className="border-gray-700 text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {testResult !== 'success' ? (
              <Button
                onClick={handleTestConnection}
                disabled={testing || !apiKey.trim() || !apiSecret.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setStep('connected')
                  onComplete()
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step: Connected */}
      {step === 'connected' && (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Connected to Binance</h3>
            <p className="text-sm text-gray-400 mt-1">Your API key is configured and active.</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
            <p className="text-xs text-gray-400">API Key</p>
            <p className="text-sm text-white font-mono mt-0.5">{maskedKey}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            className="w-full border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            Disconnect
          </Button>
        </div>
      )}
    </div>
  )
}
