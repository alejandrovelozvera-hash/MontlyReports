import { useState, useEffect } from 'react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.winIsMaximized().then(setIsMaximized)
  }, [])

  return (
    <div
      className="flex items-center justify-between shrink-0 select-none"
      style={{
        height: '38px',
        background: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.5)',
        WebkitAppRegion: 'drag',
      } as any}
    >
      {/* App name */}
      <div className="flex items-center gap-2 px-4">
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{background:'linear-gradient(145deg,#7B6FE8,#5046B5)'}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </div>
        <span className="text-xs font-medium text-surface-600 dark:text-surface-400">Design Reports</span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center h-full"
        style={{WebkitAppRegion: 'no-drag'} as any}>
        {/* Minimize */}
        <button
          onClick={() => window.electronAPI.winMinimize()}
          className="flex items-center justify-center h-full transition-colors"
          style={{width:'46px', color:'rgb(var(--text-secondary))'}}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Minimizar">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={() => { window.electronAPI.winMaximize(); setIsMaximized(m => !m) }}
          className="flex items-center justify-center h-full transition-colors"
          style={{width:'46px', color:'rgb(var(--text-secondary))'}}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}>
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="8" y="8" width="13" height="13" rx="1"/>
              <path d="M3 16V5a2 2 0 012-2h11"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="1"/>
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={() => window.electronAPI.winClose()}
          className="flex items-center justify-center h-full transition-colors"
          style={{width:'46px', color:'rgb(var(--text-secondary))'}}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.9)'; (e.currentTarget.querySelector('svg') as SVGElement).style.stroke = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; (e.currentTarget.querySelector('svg') as SVGElement).style.stroke = '' }}
          title="Cerrar">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
