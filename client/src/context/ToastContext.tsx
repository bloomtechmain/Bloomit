import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { registerToastCallback, unregisterToastCallback } from '../utils/toastEmitter'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  exiting: boolean
  duration: number
}

interface ToastContextValue {
  toasts: Toast[]
  toast: {
    success: (message: string) => void
    error:   (message: string) => void
    warning: (message: string) => void
    info:    (message: string) => void
  }
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 5
const EXIT_DELAY = 4000   // ms before exit animation starts
const REMOVE_DELAY = 300  // ms for exit animation duration

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const scheduleRemoval = useCallback((id: string, duration: number) => {
    // Set exiting state after duration
    const exitTimer = setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
      // Actually remove after animation
      const removeTimer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        timersRef.current.delete(id)
      }, REMOVE_DELAY)
      timersRef.current.set(id + '_remove', removeTimer)
    }, duration)
    timersRef.current.set(id, exitTimer)
  }, [])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const duration = EXIT_DELAY

    setToasts(prev => {
      const updated = [...prev, { id, type, message, exiting: false, duration }]
      // Cap at MAX_TOASTS — remove oldest
      return updated.length > MAX_TOASTS ? updated.slice(updated.length - MAX_TOASTS) : updated
    })

    scheduleRemoval(id, duration)
  }, [scheduleRemoval])

  const dismiss = useCallback((id: string) => {
    // Clear auto-remove timers
    const exitTimer = timersRef.current.get(id)
    const removeTimer = timersRef.current.get(id + '_remove')
    if (exitTimer)   clearTimeout(exitTimer)
    if (removeTimer) clearTimeout(removeTimer)

    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, REMOVE_DELAY)
  }, [])

  const toast = {
    success: (message: string) => addToast('success', message),
    error:   (message: string) => addToast('error', message),
    warning: (message: string) => addToast('warning', message),
    info:    (message: string) => addToast('info', message),
  }

  // Register global emitter so non-React code can trigger toasts
  useEffect(() => {
    registerToastCallback((type, message) => addToast(type, message))
    return () => unregisterToastCallback()
  }, [addToast])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
