import { useEffect, useState } from 'react'

interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'info'
  text: string
}

let toastId = 0
let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null

export function showToast(type: ToastMessage['type'], text: string) {
  if (addToastFn) addToastFn({ type, text })
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    addToastFn = (msg) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { ...msg, id }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
    }
    return () => { addToastFn = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
            t.type === 'success' ? 'bg-emerald-600 text-white' :
            t.type === 'error' ? 'bg-red-600 text-white' :
            'bg-indigo-600 text-white'
          }`}>
          {t.type === 'success' && <span className="mr-2">✓</span>}
          {t.type === 'error' && <span className="mr-2">✕</span>}
          {t.text}
        </div>
      ))}
    </div>
  )
}
