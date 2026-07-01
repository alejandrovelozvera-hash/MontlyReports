import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import ToastContainer from './Toast'
import ProformaFlow from './ProformaFlow'
import { useStore } from '../store/useStore'

export default function Layout() {
  const { clients, loadClients } = useStore()
  const [darkMode, setDarkMode] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showProforma, setShowProforma] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    window.electronAPI.getSetting('darkMode').then((v: string | null) => {
      if (v === 'true') {
        setDarkMode(true)
        document.documentElement.classList.add('dark')
      }
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setShowShortcuts((p) => !p); return
      }
      if (e.key === 'Escape') { setShowShortcuts(false); return }
      if ((e.metaKey || e.ctrlKey) && e.key === '1') { e.preventDefault(); navigate('/') }
      if ((e.metaKey || e.ctrlKey) && e.key === '2') { e.preventDefault(); navigate('/clients') }
      if ((e.metaKey || e.ctrlKey) && e.key === '3') { e.preventDefault(); navigate('/settings') }
      if ((e.metaKey || e.ctrlKey) && e.key === '4') { e.preventDefault(); setShowProforma(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    window.electronAPI.setSetting('darkMode', String(next))
  }

  return (
    <div className="flex flex-col h-screen text-surface-900 dark:text-surface-100" style={{background:"var(--app-bg)"}}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar darkMode={darkMode} onToggleDarkMode={toggleDarkMode} onOpenProforma={() => setShowProforma(true)} />
      <main className="flex-1 overflow-y-auto p-6 relative">
        <ToastContainer />
        <div key={location.pathname} className="page-enter"><Outlet /></div>

        {/* Keyboard shortcuts modal */}
        {showShortcuts && (
          <div className="dialog-overlay z-50" onClick={() => setShowShortcuts(false)}>
            <div className="dialog-panel max-w-xs" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-200 dark:border-surface-800">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Atajos de teclado</h3>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { keys: 'Ctrl+1', action: 'Dashboard' },
                  { keys: 'Ctrl+2', action: 'Clientes' },
                  { keys: 'Ctrl+3', action: 'Configuración' },
                  { keys: 'Ctrl+4', action: 'Proformas' },
                  { keys: 'Ctrl+?', action: 'Mostrar atajos' },
                  { keys: '← →', action: 'Navegar preview' },
                  { keys: 'Esc', action: 'Cerrar diálogos' },
                ].map((s) => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <span className="text-sm text-surface-600 dark:text-surface-400">{s.action}</span>
                    <kbd className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-xs font-mono text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700">{s.keys}</kbd>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-surface-200 dark:border-surface-800 flex justify-end">
                <button onClick={() => setShowShortcuts(false)} className="btn-secondary">Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {showProforma && (
          <ProformaFlow
            clients={clients}
            onClose={() => setShowProforma(false)}
          />
        )}
      </main>
      </div>
    </div>
  )
}
