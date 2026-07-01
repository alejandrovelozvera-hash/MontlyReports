import { useEffect, useState, useCallback } from 'react'

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

const DURATION = 3500

const icons: Record<string, string> = {
  success: 'M20 6L9 17l-5-5',
  error: 'M18 6L6 18M6 6l12 12',
  info: 'M12 16v-4m0-4h.01',
}

const borders: Record<string, string> = {
  success: 'rgba(29,158,117,0.3)',
  error: 'rgba(239,68,68,0.3)',
  info: 'rgba(99,102,241,0.3)',
}

const accentColors: Record<string, string> = {
  success: 'rgb(29,158,117)',
  error: 'rgb(239,68,68)',
  info: 'rgb(99,102,241)',
}

function ToastItem({ t, onClose }: { t: ToastMessage; onClose: (id: number) => void }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(100)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 30)
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onClose(t.id), 200)
    }, DURATION)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [t.id, onClose])

  return (
    <div className={`pointer-events-auto flex flex-col overflow-hidden rounded-xl shadow-lg backdrop-blur-xl transition-all duration-300 ${exiting ? 'opacity-0 translate-x-8' : visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
      style={{ background: 'rgba(255,255,255,0.85)', border: '0.5px solid rgba(255,255,255,0.9)' }}>
      <div className="flex items-start gap-3 px-4 pt-3 pb-2.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${accentColors[t.type]}15` }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accentColors[t.type]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={icons[t.type]} />
          </svg>
        </div>
        <p className="text-sm font-medium flex-1" style={{ color: 'rgb(23,23,23)' }}>{t.text}</p>
        <button onClick={() => { setExiting(true); setTimeout(() => onClose(t.id), 200) }}
          className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgb(115,115,115)' }}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="h-0.5 w-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <div className="h-full transition-all duration-[30ms] linear" style={{ width: `${progress}%`, background: accentColors[t.type] }} />
      </div>
    </div>
  )
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    addToastFn = (msg) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { ...msg, id }])
    }
    return () => { addToastFn = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onClose={removeToast} />
      ))}
    </div>
  )
}
