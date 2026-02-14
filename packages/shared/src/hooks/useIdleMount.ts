import { useState, useEffect } from 'react'

/**
 * Hook that returns true once either requestIdleCallback fires or 1200ms elapse.
 * Also triggers immediately on first user intent (keydown, pointermove, touchstart).
 */
export function useIdleMount(): boolean {
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (shouldMount) return

    let timeoutId: number
    let idleCallbackId: number
    let isHandlerActive = true

    const activate = () => {
      if (!isHandlerActive) return
      setShouldMount(true)
      cleanup()
    }

    const cleanup = () => {
      isHandlerActive = false
      if (timeoutId) clearTimeout(timeoutId)
      if (idleCallbackId && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleCallbackId)
      }
      // Remove user intent listeners
      document.removeEventListener('keydown', activate)
      document.removeEventListener('pointermove', activate)
      document.removeEventListener('touchstart', activate)
    }

    // Set up user intent listeners for immediate activation
    document.addEventListener('keydown', activate)
    document.addEventListener('pointermove', activate)
    document.addEventListener('touchstart', activate)

    // Use requestIdleCallback if available, with timeout fallback
    if (window.requestIdleCallback) {
      idleCallbackId = window.requestIdleCallback(activate, { timeout: 1200 })
    } else {
      // Fallback for browsers without requestIdleCallback
      timeoutId = window.setTimeout(activate, 1200)
    }

    return cleanup
  }, [shouldMount])

  return shouldMount
}
