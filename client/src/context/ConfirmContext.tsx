import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface ConfirmOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmRequest {
  message: string
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

interface ConfirmContextValue {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
  request: ConfirmRequest | null
  resolve: (value: boolean) => void
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setRequest({ message, options, resolve })
    })
  }, [])

  const handleResolve = useCallback((value: boolean) => {
    request?.resolve(value)
    setRequest(null)
  }, [request])

  return (
    <ConfirmContext.Provider value={{ confirm, request, resolve: handleResolve }}>
      {children}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}

export function useConfirmState() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirmState must be used within ConfirmProvider')
  return { request: ctx.request, resolve: ctx.resolve }
}
