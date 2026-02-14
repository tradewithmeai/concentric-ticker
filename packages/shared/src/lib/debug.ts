export const IS_PROD = import.meta.env.PROD === true
export const DEBUG: boolean = !IS_PROD // hard OFF in prod, ON in dev only

export function isDebug(): boolean {
  return DEBUG
}

// Optional kill-switch in prod (defensive)
if (IS_PROD) {
  try {
    localStorage.removeItem('debug')
    localStorage.removeItem('debugMode')
  } catch {}
}