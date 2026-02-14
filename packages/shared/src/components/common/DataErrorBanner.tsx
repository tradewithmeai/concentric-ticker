import { useState } from 'react'
import { useErrorInfo, requestRetry, useInFlight } from '../../state/appStore'

export function DataErrorBanner() {
  const errorInfo = useErrorInfo()
  const inFlight = useInFlight()
  const [showDetails, setShowDetails] = useState(false)

  if (!errorInfo) return null

  const handleRetry = () => {
    requestRetry()
  }

  const handleToggleDetails = () => {
    setShowDetails(!showDetails)
  }

  return (
    <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="text-red-600 text-sm font-medium">
            Data error
            {errorInfo.code && (
              <span className="ml-1 text-red-500 font-mono text-xs">[{errorInfo.code}]</span>
            )}
          </div>
          {errorInfo.message && (
            <div className="text-red-700 text-sm">
              {errorInfo.message.length > 60
                ? `${errorInfo.message.substring(0, 60)}...`
                : errorInfo.message}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRetry}
            disabled={inFlight}
            aria-disabled={inFlight}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inFlight ? 'Retrying...' : 'Retry'}
          </button>
          <button
            onClick={handleToggleDetails}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
          >
            Details
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <div className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded border overflow-auto max-h-32">
            {errorInfo.code === 429 && errorInfo.retryAfterSec ? (
              <div>
                <div>Rate limit reached</div>
                <div>Cooldown: ~{errorInfo.retryAfterSec} seconds</div>
                <div className="mt-2 text-gray-600">Full details:</div>
                <div>{JSON.stringify(errorInfo, null, 2)}</div>
              </div>
            ) : (
              JSON.stringify(errorInfo, null, 2)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
