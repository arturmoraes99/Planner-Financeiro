import { useState, useCallback } from 'react'

export type ToastType = 'ok' | 'err' | 'info'

interface Toast {
  msg: string
  type: ToastType
  visible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<Toast>({ msg: '', type: 'ok', visible: false })

  const showToast = useCallback((msg: string, type: ToastType = 'ok') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800)
  }, [])

  return { toast, showToast }
}