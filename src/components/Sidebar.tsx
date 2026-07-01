import { NavLink, useNavigate } from 'react-router-dom'

interface Props { darkMode: boolean; onToggleDarkMode: () => void; onOpenProforma: () => void }

const sections = [
  { label: 'Principal', links: [
    { to: '/', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { to: '/clients', label: 'Clientes', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' },
  ]},
  { label: 'Reportes', links: [
    { to: '/finance', label: 'Finanzas', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 1v1' },
    { to: '/settings', label: 'Configuración', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z' },
  ]},
]

export default function Sidebar({ darkMode, onToggleDarkMode, onOpenProforma }: Props) {
  const navigate = useNavigate()

  return (
    <aside className="w-52 glass-panel flex flex-col shrink-0">
      <div className="px-5 pt-5 pb-4" style={{borderBottom:'0.5px solid var(--glass-border)'}}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
          style={{background:'linear-gradient(145deg,#7B6FE8,#5046B5)'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </div>
        <h1 className="text-sm font-semibold tracking-tight text-surface-900 dark:text-surface-100">Design Reports</h1>
        <p className="text-[10px] text-surface-400 mt-0.5">Monthly manager</p>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {sections.map(sec => (
          <div key={sec.label}>
            <p className="text-[10px] font-semibold tracking-widest px-3 pb-1.5 text-surface-400 dark:text-surface-500">
              {sec.label.toUpperCase()}
            </p>
            <div className="space-y-0.5">
              {sec.links.map(link => (
                  <NavLink key={link.to} to={link.to} end={link.to === '/'}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'
                      }`
                    }
                    style={({ isActive }) => isActive ? {background:'rgba(80,70,181,0.1)'} : {}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                      <path d={link.icon}/>
                    </svg>
                    {link.label}
                  </NavLink>
              ))}
              {sec.label === 'Principal' && (
                <button onClick={onOpenProforma}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  </svg>
                  Proformas
                </button>
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3" style={{borderTop:'0.5px solid var(--glass-border)'}}>
        <button onClick={onToggleDarkMode}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-all"
          style={{background:'transparent'}}
          onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.4)')}
          onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            {darkMode
              ? <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></>
              : <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            }
          </svg>
          {darkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>
    </aside>
  )
}
