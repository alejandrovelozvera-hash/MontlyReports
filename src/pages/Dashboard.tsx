import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getMonthName, getCurrentMonth, getCurrentYear } from '../utils/date'
import UnifiedUploadDialog from '../components/UnifiedUploadDialog'
import StatsChart from '../components/StatsChart'
import SearchBar from '../components/SearchBar'

const CATEGORY_COLORS: Record<string, string> = {
  Logo: '#6366f1', Web: '#8b5cf6', Redes: '#ec4899',
  Packaging: '#f97316', Branding: '#22c55e', Otro: '#a3a3a3',
}

export default function Dashboard() {
  const { clients, loadClients, loading } = useStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalDesigns: 0, thisMonth: 0, monthRevenue: 0 })
  const [goal, setGoal] = useState(0)
  const [goalInput, setGoalInput] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [overdueAlerts, setOverdueAlerts] = useState<{name:string;title:string;days:number}[]>([])
  const [categoryStats, setCategoryStats] = useState<{ category: string; count: number }[]>([])
  const [uploadClient, setUploadClient] = useState<Client | null>(null)
  const [previews, setPreviews] = useState<Record<string, Design[]>>({})

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    async function loadStats() {
      const cm = getCurrentMonth(); const cy = getCurrentYear()
      // Fix 1: cargar todos los diseños en paralelo
      const allDesigns = await Promise.all(clients.map((c) => window.electronAPI.getDesigns(c.id)))
      let total = 0; let month = 0; let monthRevenue = 0
      const catMap: Record<string, number> = {}
      const p: Record<string, Design[]> = {}
      clients.forEach((c, i) => {
        const d = allDesigns[i]
        total += d.length
        d.forEach((x) => {
          const dd = new Date(x.design_date)
          const isThisMonth = dd.getMonth() + 1 === cm && dd.getFullYear() === cy
          if (isThisMonth) { month++; monthRevenue += x.price || 0 }
          const cat = x.category || 'Sin categoría'
          catMap[cat] = (catMap[cat] || 0) + 1
        })
        p[c.id] = d.slice(0, 3)
      })
      setStats({ totalDesigns: total, thisMonth: month, monthRevenue })
      setCategoryStats(Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count))
      setPreviews(p)

      // Overdue alerts: designs unpaid for >7 days
      const overdue: {name:string;title:string;days:number}[] = []
      clients.forEach((c, i) => {
        allDesigns[i].forEach((d: any) => {
          if (!d.paid && d.price > 0) {
            const days = Math.floor((Date.now() - new Date(d.design_date).getTime()) / 86400000)
            if (days > 7) overdue.push({ name: c.name, title: d.title, days })
          }
        })
      })
      overdue.sort((a,b) => b.days - a.days)
      setOverdueAlerts(overdue.slice(0, 5))

      // Send Windows notification if overdue items exist
      if (overdue.length > 0 && window.electronAPI.notify) {
        window.electronAPI.notify(
          'Cobros pendientes',
          `Tienes ${overdue.length} diseño${overdue.length !== 1 ? 's' : ''} sin cobrar con más de 7 días`
        )
      }

      // Load goal for current month
      const cy2 = getCurrentYear(); const cm2 = getCurrentMonth()
      const g = await window.electronAPI.getGoal(cm2, cy2)
      if (g) { setGoal(g.goal); setGoalInput(String(g.goal)) }
    }
    if (clients.length > 0) loadStats()
  }, [clients])

  const month = getMonthName(getCurrentMonth())
  const year = getCurrentYear()

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-surface-900 dark:text-surface-100 tracking-tight">Dashboard</h2>
          <p className="text-sm text-surface-500 mt-1">Resumen de actividad — {month} {year}</p>
        </div>
        <div className="w-72">
          <SearchBar />
        </div>
      </div>

      {/* Stats glass cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Clientes', value: clients.length, color: 'rgba(80,70,181,1)' },
          { label: 'Diseños totales', value: stats.totalDesigns, color: 'rgba(80,70,181,1)' },
          { label: `Diseños ${month}`, value: stats.thisMonth, color: 'rgba(80,70,181,1)' },
          ...(stats.monthRevenue > 0 ? [{ label: `Ingresos ${month}`, value: `$${stats.monthRevenue.toFixed(2)}`, color: 'rgb(29,158,117)' }] : []),
        ].map((s, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{color:'rgb(var(--text-secondary))'}}>
              {s.label}
            </p>
            <p className="text-3xl font-semibold mt-2 tracking-tight" style={{color:s.color}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Meta mensual */}
      {(goal > 0 || editingGoal) && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{color:'rgb(var(--text-secondary))'}}>Meta mensual</p>
              <p className="text-sm font-medium mt-0.5" style={{color:'rgb(var(--text-primary))'}}>
                ${stats.monthRevenue.toFixed(2)} de ${goal.toFixed(2)}
              </p>
            </div>
            {!editingGoal ? (
              <button onClick={() => setEditingGoal(true)} className="btn-ghost text-xs">Editar</button>
            ) : (
              <div className="flex gap-2">
                <input value={goalInput} onChange={e => setGoalInput(e.target.value)}
                  className="input text-sm w-24" type="number" min="0" placeholder="$0.00" />
                <button onClick={async () => {
                  const v = parseFloat(goalInput) || 0
                  await window.electronAPI.setGoal(getCurrentMonth(), getCurrentYear(), v)
                  setGoal(v); setEditingGoal(false)
                }} className="btn-primary text-sm">OK</button>
              </div>
            )}
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{background:'rgba(0,0,0,0.08)'}}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width:`${Math.min(100,(stats.monthRevenue/goal)*100)}%`,
                background: stats.monthRevenue >= goal ? 'rgb(29,158,117)' : 'rgb(80,70,181)'
              }}/>
          </div>
          <p className="text-[11px] mt-1.5" style={{color:'rgb(var(--text-secondary))'}}>
            {stats.monthRevenue >= goal ? '🎉 ¡Meta alcanzada!' : `${Math.round((stats.monthRevenue/goal)*100)}% completado`}
          </p>
        </div>
      )}
      {!goal && !editingGoal && (
        <button onClick={() => setEditingGoal(true)} className="btn-secondary text-sm w-full">
          🎯 Definir meta mensual de ingresos
        </button>
      )}

      {/* Alertas de cobro pendiente */}
      {overdueAlerts.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-sm font-semibold mb-3" style={{color:'rgb(var(--text-primary))'}}>
            ⚠️ Cobros pendientes con más de 7 días
          </p>
          <div className="space-y-2">
            {overdueAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                style={{background:'rgba(239,68,68,0.07)',border:'0.5px solid rgba(239,68,68,0.15)'}}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{color:'rgb(var(--text-primary))'}}>{a.title}</p>
                  <p className="text-[11px]" style={{color:'rgb(var(--text-secondary))'}}>{a.name}</p>
                </div>
                <span className="text-xs font-semibold text-red-500">{a.days}d</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {clients.length > 0 && <StatsChart />}

        {/* Category pie */}
        {categoryStats.length > 0 && (
          <div className="card p-5">
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">Diseños por categoría</h4>
            <div className="flex items-center gap-6">
              <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
                {(() => {
                  const total = categoryStats.reduce((s, c) => s + c.count, 0)
                  let acc = 0
                  return categoryStats.map((cat) => {
                    const pct = cat.count / total
                    const angle = pct * 360
                    const start = (acc / total) * 360
                    const end = start + angle
                    acc += cat.count
                    const r = 50; const cx = 60; const cy = 60
                    const toRad = (d: number) => (d - 90) * Math.PI / 180
                    const x1 = cx + r * Math.cos(toRad(start))
                    const y1 = cy + r * Math.sin(toRad(start))
                    const x2 = cx + r * Math.cos(toRad(end))
                    const y2 = cy + r * Math.sin(toRad(end))
                    const large = angle > 180 ? 1 : 0
                    const color = CATEGORY_COLORS[cat.category] || '#a3a3a3'
                    return <path key={cat.category} d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} />
                  })
                })()}
              </svg>
              <div className="space-y-1.5">
                {categoryStats.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#a3a3a3' }} />
                    <span className="text-xs text-surface-600 dark:text-surface-400">{cat.category}</span>
                    <span className="text-xs font-medium text-surface-900 dark:text-surface-100 ml-auto">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clients */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Tus clientes</h3>
          <button onClick={() => navigate('/clients')} className="btn-ghost text-sm">Ver todos</button>
        </div>

        {clients.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">No hay clientes aún</h4>
            <p className="text-sm text-surface-400 mb-4">Agrega tu primer cliente para comenzar</p>
            <button onClick={() => navigate('/clients')} className="btn-primary">Agregar cliente</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div key={client.id} className="card group hover:shadow-md transition-all duration-200">
                <button onClick={() => navigate(`/clients/${client.id}`)} className="w-full p-5 text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ backgroundColor: client.color }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{client.name}</p>
                      {client.company && <p className="text-xs text-surface-400 truncate">{client.company}</p>}
                    </div>
                  </div>
                  {previews[client.id] && previews[client.id].length > 0 && (
                    <div className="flex gap-1.5 mb-2">
                      {previews[client.id].map((d) => (
                        <div key={d.id} className="w-12 h-10 rounded-md overflow-hidden bg-surface-100 dark:bg-surface-800">
                          <img src={window.electronAPI.getImageUrl(d.thumbnail_path || d.file_path)} alt=""
                            className="w-full h-full object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-surface-400">Creado {new Date(client.created_at).toLocaleDateString('es-ES')}</p>
                </button>
                <div className="flex border-t border-surface-100 dark:border-surface-800">
                  <button onClick={() => setUploadClient(client)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Subir
                  </button>
                  <button onClick={() => navigate(`/clients/${client.id}`)}
                    className="flex-1 py-2.5 text-xs font-medium text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploadClient && (
        <UnifiedUploadDialog clientId={uploadClient.id} month={getCurrentMonth()} year={getCurrentYear()}
          onUpload={async (items) => {
            for (const item of items) {
              await window.electronAPI.createDesign({
                clientId: uploadClient.id, title: item.title, category: item.category,
                filePath: item.path, fileName: item.name,
                designDate: `${getCurrentYear()}-${String(getCurrentMonth()).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
                price: item.price,
              })
            }
            setUploadClient(null)
          }}
          onClose={() => setUploadClient(null)} />
      )}
    </div>
  )
}
