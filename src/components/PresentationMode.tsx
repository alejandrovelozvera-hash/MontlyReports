import { useState, useEffect, useCallback } from 'react'
import { getMonthName } from '../utils/date'

interface Props {
  designs: any[]
  client: any
  month: number
  year: number
  onClose: () => void
}

export default function PresentationMode({ designs, client, month, year, onClose }: Props) {
  const [current, setCurrent] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const [interval, setIntervalMs] = useState(4000)

  const next = useCallback(() => setCurrent(c => (c + 1) % designs.length), [designs.length])
  const prev = useCallback(() => setCurrent(c => (c - 1 + designs.length) % designs.length), [designs.length])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
      else if (e.key === 'p' || e.key === 'P') setAutoPlay(a => !a)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, onClose])

  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(next, interval)
    return () => clearInterval(timer)
  }, [autoPlay, interval, next])

  if (designs.length === 0) return null
  const d = designs[current]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col"
      style={{background:'rgba(0,0,0,0.97)'}}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{background:'rgba(0,0,0,0.5)'}}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
            style={{background:`linear-gradient(145deg,${client.color},${client.color}cc)`}}>
            {client.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{client.name}</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>
              {getMonthName(month)} {year} · {designs.length} diseños
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto play */}
          <div className="flex items-center gap-2">
            <select value={interval} onChange={e => setIntervalMs(parseInt(e.target.value))}
              className="text-xs px-2 py-1 rounded-lg text-white"
              style={{background:'rgba(255,255,255,0.1)',border:'0.5px solid rgba(255,255,255,0.2)'}}>
              <option value={2000}>2s</option>
              <option value={4000}>4s</option>
              <option value={6000}>6s</option>
              <option value={10000}>10s</option>
            </select>
            <button onClick={() => setAutoPlay(a => !a)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: autoPlay ? 'rgba(80,70,181,0.4)' : 'rgba(255,255,255,0.1)',
                color: 'white', border: '0.5px solid rgba(255,255,255,0.2)'
              }}>
              {autoPlay ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Pausar</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>Auto</>
              )}
            </button>
          </div>

          {/* Counter */}
          <span className="text-sm text-white font-mono">{current + 1} / {designs.length}</span>

          {/* Close */}
          <button onClick={onClose}
            className="p-2 rounded-xl transition-all text-white"
            style={{background:'rgba(255,255,255,0.1)'}}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center relative px-20">
        <button onClick={prev}
          className="absolute left-4 p-3 rounded-2xl text-white transition-all z-10"
          style={{background:'rgba(255,255,255,0.08)'}}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="flex flex-col items-center gap-4 max-w-3xl w-full">
          {d.file_path ? (
            <img src={d.file_path.startsWith('http') ? d.file_path : `file://${d.file_path}`} alt={d.title}
              className="max-h-[65vh] max-w-full object-contain rounded-2xl shadow-2xl"
              style={{boxShadow:'0 30px 80px rgba(0,0,0,0.6)'}} />
          ) : (
            <div className="w-64 h-64 rounded-2xl flex items-center justify-center"
              style={{background:'rgba(255,255,255,0.05)'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}

          {/* Design info */}
          <div className="text-center">
            <p className="text-xl font-semibold text-white mb-1">{d.title}</p>
            <div className="flex items-center justify-center gap-3">
              <span className="pill-purple text-xs">{d.category}</span>
              {d.price > 0 && (
                <span className="text-sm font-semibold" style={{color:'rgb(34,197,94)'}}>
                  ${d.price.toFixed(2)}{d.paid ? ' ✓' : ''}
                </span>
              )}
              <span className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
                {new Date(d.design_date).toLocaleDateString('es-ES', {day:'2-digit',month:'short'})}
              </span>
            </div>
            {d.description && (
              <p className="text-sm mt-2 max-w-md" style={{color:'rgba(255,255,255,0.5)'}}>{d.description}</p>
            )}
          </div>
        </div>

        <button onClick={next}
          className="absolute right-4 p-3 rounded-2xl text-white transition-all z-10"
          style={{background:'rgba(255,255,255,0.08)'}}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 px-8 py-4 overflow-x-auto shrink-0"
        style={{background:'rgba(0,0,0,0.5)'}}>
        {designs.map((des, i) => (
          <button key={des.id} onClick={() => setCurrent(i)}
            className="shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all"
            style={{
              opacity: i === current ? 1 : 0.4,
              border: i === current ? '2px solid rgba(80,70,181,0.8)' : '2px solid transparent',
              background:'rgba(255,255,255,0.05)'
            }}>
            {des.file_path ? (
              <img src={des.file_path.startsWith('http') ? des.file_path : `file://${des.file_path}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Keyboard hints */}
      <div className="flex justify-center pb-3 gap-4 shrink-0">
        {[['←→','Navegar'],['Espacio','Siguiente'],['P','Auto play'],['Esc','Salir']].map(([k,l]) => (
          <span key={k} className="text-[10px]" style={{color:'rgba(255,255,255,0.3)'}}>
            <kbd className="px-1.5 py-0.5 rounded" style={{background:'rgba(255,255,255,0.1)'}}>{k}</kbd> {l}
          </span>
        ))}
      </div>
    </div>
  )
}
