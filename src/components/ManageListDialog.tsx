import { useState, useRef, useEffect } from 'react'

interface Props {
  title: string
  items: string[]
  defaults: string[]
  onAdd: (name: string) => Promise<void>
  onDelete: (name: string) => Promise<void>
  onClose: () => void
}

export default function ManageListDialog({ title, items, defaults, onAdd, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState('')
  const [localItems, setLocalItems] = useState(items)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocalItems(items); ref.current?.focus() }, [items])

  async function handleAdd() {
    const name = newName.trim()
    if (!name || localItems.includes(name)) return
    await onAdd(name)
    setLocalItems((prev) => [...prev, name])
    setNewName('')
    ref.current?.focus()
  }

  async function handleDelete(name: string) {
    await onDelete(name)
    setLocalItems((prev) => prev.filter((c) => c !== name))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white dark:bg-surface-800 rounded-xl p-5 shadow-xl min-w-[320px] max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input ref={ref} value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Nuevo elemento..." className="input flex-1 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <button onClick={handleAdd} disabled={!newName.trim()} className="btn-primary text-sm whitespace-nowrap">Añadir</button>
        </div>

        <div className="space-y-1 max-h-[40vh] overflow-y-auto">
          {localItems.map((item) => (
            <div key={item} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800/50 group">
              <span className="text-sm text-surface-700 dark:text-surface-300">{item}</span>
              {!defaults.includes(item) && (
                <button onClick={() => handleDelete(item)}
                  className="p-1 rounded text-surface-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-surface-400 mt-3">Los elementos por defecto no se pueden eliminar.</p>
      </div>
    </div>
  )
}
