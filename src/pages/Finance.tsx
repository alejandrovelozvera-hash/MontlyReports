import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getMonthName, getCurrentMonth, getCurrentYear, formatCurrency } from '../utils/date'
import CategoryChart from '../components/CategoryChart'
import ProformaFlow from '../components/ProformaFlow'

interface MonthStat {
  month: number; year: number; label: string
  revenue: number; paid: number; pending: number; count: number
}

interface ClientStat {
  id: string; name: string; color: string
  revenue: number; paid: number; pending: number; count: number
}

export default function Finance() {
  const { clients, loadClients } = useStore()
  const [searchParams] = useSearchParams()
  const [monthStats, setMonthStats] = useState<MonthStat[]>([])
  const [clientStats, setClientStats] = useState<ClientStat[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'mensual' | 'clientes'>('mensual')
  const [showProforma, setShowProforma] = useState(false)

  useEffect(() => { loadClients() }, [])
  useEffect(() => { if (searchParams.get('proforma') === '1') setShowProforma(true) }, [searchParams])

  useEffect(() => {
    if (clients.length === 0) return
    async function load() {
      setLoading(true)
      const allDesigns = await Promise.all(clients.map((c) => window.electronAPI.getDesigns(c.id)))

      // Stats por mes (últimos 6 meses)
      const cy = getCurrentYear(); const cm = getCurrentMonth()
      const months: MonthStat[] = []
      for (let i = 5; i >= 0; i--) {
        let m = cm - i; let y = cy
        if (m <= 0) { m += 12; y -= 1 }
        let revenue = 0; let paid = 0; let pending = 0; let count = 0
        allDesigns.flat().forEach((d) => {
          const dd = new Date(d.design_date)
          if (dd.getMonth() + 1 === m && dd.getFullYear() === y) {
            const p = d.price || 0
            revenue += p; count++
            if (d.paid) paid += p; else pending += p
          }
        })
        months.push({ month: m, year: y, label: `${getMonthName(m).substring(0, 3)} ${y}`, revenue, paid, pending, count })
      }
      setMonthStats(months)

      // Stats por cliente
      const cStats: ClientStat[] = clients.map((c, i) => {
        let revenue = 0; let paid = 0; let pending = 0; let count = 0
        allDesigns[i].forEach((d) => {
          const p = d.price || 0; revenue += p; count++
          if (d.paid) paid += p; else pending += p
        })
        return { id: c.id, name: c.name, color: c.color, revenue, paid, pending, count }
      }).sort((a, b) => b.revenue - a.revenue)
      setClientStats(cStats)
      setLoading(false)
    }
    load()
  }, [clients])

  const totalRevenue = monthStats.reduce((s, m) => s + m.revenue, 0)
  const totalPaid = monthStats.reduce((s, m) => s + m.paid, 0)
  const totalPending = monthStats.reduce((s, m) => s + m.pending, 0)
  const thisMonth = monthStats[monthStats.length - 1]
  const lastMonth = monthStats[monthStats.length - 2]
  const growth = lastMonth?.revenue > 0 ? ((thisMonth?.revenue - lastMonth?.revenue) / lastMonth?.revenue) * 100 : 0
  const maxRevenue = Math.max(...monthStats.map((m) => m.revenue), 1)

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl skeleton" />)}
      </div>
      <div className="h-64 rounded-2xl skeleton" />
    </div>
  )

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="page-heading">Finanzas</h2>
          <p className="text-sm text-surface-500 mt-1">Resumen de ingresos y pagos</p>
        </div>
        <button onClick={() => setShowProforma(true)} className="btn-secondary shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
          </svg>
          Nueva proforma
        </button>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Este mes</p>
          <p className="text-2xl font-semibold text-surface-900 dark:text-surface-100 mt-2 truncate">{formatCurrency(thisMonth?.revenue || 0)}</p>
          {growth !== 0 && (
            <p className={`text-xs mt-1 font-medium ${growth > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {growth > 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}% vs mes anterior
            </p>
          )}
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Últimos 6 meses</p>
          <p className="text-2xl font-semibold text-surface-900 dark:text-surface-100 mt-2 truncate">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Cobrado</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-2 truncate">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Pendiente de cobro</p>
          <p className="text-2xl font-semibold text-amber-500 mt-2 truncate">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-800">
        {(['mensual', 'clientes'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`pb-2 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${view === v ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
            {v === 'mensual' ? 'Por mes' : 'Por cliente'}
          </button>
        ))}
      </div>

      {view === 'mensual' && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-5">Ingresos por mes</h3>
          <div className="space-y-3">
            {monthStats.map((m) => (
              <div key={`${m.year}-${m.month}`} className="grid grid-cols-[80px_1fr_80px] gap-3 items-center">
                <span className="text-xs text-surface-500 text-right">{m.label}</span>
                <div className="relative h-6 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-indigo-500/20 rounded-full transition-all" style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all" style={{ width: `${(m.paid / maxRevenue) * 100}%` }} />
                  {m.pending > 0 && <div className="absolute inset-y-0 bg-amber-400 rounded-full transition-all" style={{ left: `${(m.paid / maxRevenue) * 100}%`, width: `${(m.pending / maxRevenue) * 100}%` }} />}
                </div>
                <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{formatCurrency(m.revenue)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-xs text-surface-500">Cobrado</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-xs text-surface-500">Pendiente</span></div>
          </div>
        </div>
      )}

      {view === 'clientes' && (
        <div className="glass-card divide-y divide-surface-100 dark:divide-surface-800">
          {clientStats.filter((c) => c.revenue > 0).map((c) => (
            <div key={c.id} className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ backgroundColor: c.color }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{c.name}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Cobrado: {formatCurrency(c.paid)}</span>
                  {c.pending > 0 && <span className="text-xs text-amber-500">Pendiente: {formatCurrency(c.pending)}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{formatCurrency(c.revenue)}</p>
                <p className="text-xs text-surface-400">{c.count} diseños</p>
              </div>
            </div>
          ))}
          {clientStats.every((c) => c.revenue === 0) && (
            <div className="p-8 text-center text-surface-400 text-sm">No hay ingresos registrados aún</div>
          )}
        </div>
      )}
      <CategoryChart />
      {showProforma && (
        <ProformaFlow
          clients={clients}
          month={getCurrentMonth()}
          year={getCurrentYear()}
          onClose={() => setShowProforma(false)}
        />
      )}
    </div>
  )
}
