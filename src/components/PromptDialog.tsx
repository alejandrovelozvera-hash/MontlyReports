import { useState, useRef, useEffect } from 'react'

interface Props {
  title: string
  placeholder?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export default function PromptDialog({ title, placeholder, onConfirm, onCancel }: Props) {
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-xl min-w-[260px]" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium mb-2">{title}</p>
        <input ref={ref} value={val} onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="input w-full" onKeyDown={(e) => e.key === 'Enter' && val.trim() && onConfirm(val.trim())} />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancel} className="btn-ghost text-xs">Cancelar</button>
          <button onClick={() => val.trim() && onConfirm(val.trim())} className="btn-primary text-xs">Añadir</button>
        </div>
      </div>
    </div>
  )
}
