import React, { useState } from 'react'
import { Info, X } from 'lucide-react'
import { buildSteps } from './OnboardingTutorial'

interface InfoButtonProps {
  stepIndex: number
  className?: string
}

export const InfoButton: React.FC<InfoButtonProps> = ({ stepIndex, className = '' }) => {
  const [open, setOpen] = useState(false)
  const [steps] = useState(() => buildSteps())
  const step = steps[stepIndex]

  if (!step) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-700/60 hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-colors ${className}`}
        aria-label={`Help: ${step.title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-700 rounded-xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-300"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4 pt-2">
              <div
                className={`mx-auto w-14 h-14 rounded-full ${step.iconBg} flex items-center justify-center`}
              >
                {step.icon}
              </div>

              <h2 className="text-xl font-bold text-white text-center">
                {step.title}
              </h2>

              <div className="text-sm text-gray-300 text-left">
                {step.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
