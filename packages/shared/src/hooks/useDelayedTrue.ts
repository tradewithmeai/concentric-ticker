import { useState, useEffect } from 'react'

export function useDelayedTrue(flag: boolean, delayMs = 150): boolean {
  const [delayedFlag, setDelayedFlag] = useState(false)

  useEffect(() => {
    if (!flag) {
      setDelayedFlag(false)
      return
    }

    const timer = setTimeout(() => {
      if (flag) {
        setDelayedFlag(true)
      }
    }, delayMs)

    return () => {
      clearTimeout(timer)
      setDelayedFlag(false)
    }
  }, [flag, delayMs])

  return delayedFlag
}
