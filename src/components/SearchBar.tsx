import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(Design & { client_name: string })[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    const timer = setTimeout(async () => {
      const r = await window.electronAPI.searchDesigns(query)
      setResults(r)
      setOpen(r.length > 0)
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (design: Design & { client_name: string }) => {
    setOpen(false)
    setQuery('')
    navigate(`/clients/${design.client_id}`)
  }

  return (
    <div className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          className="input pl-9 h-9 text-sm" placeholder="Buscar diseños o clientes..." />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-surface-300 hover:text-surface-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div ref={panelRef} className="absolute top-full mt-1 left-0 right-0 z-50 card shadow-lg max-h-72 overflow-y-auto">
          {results.map((d) => (
            <button key={d.id} onClick={() => handleSelect(d)}
              className="w-full flex items-center gap-3 p-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-left border-b border-surface-100 dark:border-surface-800 last:border-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800 shrink-0">
                <img src={window.electronAPI.getImageUrl(d.thumbnail_path || d.file_path)} alt="" className="w-full h-full object-contain bg-surface-100" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{d.title}</p>
                <p className="text-xs text-surface-400 truncate">{d.client_name}{d.category ? ` · ${d.category}` : ''}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300 shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
