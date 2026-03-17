/**
 * Module-level toast emitter — lets non-React code (e.g. apiClient.ts) fire toasts.
 * ToastContext registers callbacks here on mount.
 */
type ToastType = 'success' | 'error' | 'warning' | 'info'
type ToastCallback = (type: ToastType, message: string) => void

let _callback: ToastCallback | null = null

export function registerToastCallback(fn: ToastCallback) {
  _callback = fn
}

export function unregisterToastCallback() {
  _callback = null
}

export function emitToast(type: ToastType, message: string) {
  if (_callback) {
    _callback(type, message)
  } else {
    // Fallback when no React context is mounted yet (rare)
    console.warn(`[Toast ${type}]`, message)
  }
}
