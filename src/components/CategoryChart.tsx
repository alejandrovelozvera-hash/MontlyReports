import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/date'

interface CatStat { category: string; revenue: number; count: number; color: string }

const CAT_COLORS: Record<string, string> = {
  'Logo': '#6366f1',
  'Redes sociales': '#ec4899',
  'Web': '#0ea5e9',
  'Impresión': '#f59e0b',
  'Presentación': '#8b5cf6',
  'Video': '#ef4444',
  'Otro': '#6b7280',
}

function getColor(cat: string) { return CAT_COLORS[cat] || '#6366f1' }

export default function CategoryChart() {
  const { clients } = useStore()
  const [stats, setStats] = useState<CatStat[]>([])
  const [loading, setLoading] = useState(true)
  const [month] = useState(getCurrentMonth())
  const [year] = useState(getCurrentYear())

  useEffect(() => {
    async function load() {
      setLoading(true)
      const all = await Promise.all(clients.map(c => window.electronAPI.getDesigns(c.id)))
      const map: Record<string, {revenue:number;count:number}> = {}
      all.flat().forEach((d: any) => {
        const dd = new Date(d.design_date)
        if (dd.getMonth()+1 !== month || dd.getFullYear() !== year) return
        const cat = d.category || 'Otro'
        if (!map[cat]) map[cat] = { revenue: 0, count: 0 }
        map[cat].revenue += d.price || 0
        map[cat].count++
      })
      const result = Object.entries(map)
        .map(([category, s]) => ({ category, ...s, color: getColor(category) }))
        .sort((a,b) => b.revenue - a.revenue)
      setStats(result)
      setLoading(false)
    }
    if (clients.length > 0) load()
  }, [clients, month, year])

  const total = stats.reduce((s, c) => s + c.revenue, 0)

  if (loading) return (
    <div className="glass-card p-5 flex items-center justify-center h-32">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{borderColor:'rgba(80,70,181,0.3)',borderTopColor:'rgb(80,70,181)'}}/>
    </div>
  )

  if (stats.length === 0) return (
    <div className="glass-card p-5 text-center">
      <p className="text-sm" style={{color:'rgb(var(--text-secondary))'}}>Sin datos para {getMonthName(month)}</p>
    </div>
  )

  // SVG Donut chart
  const SIZE = 140; const R = 52; const CX = SIZE/2; const CY = SIZE/2
  const circumference = 2 * Math.PI * R
  let offset = 0
  const segments = stats.map(s => {
    const pct = total > 0 ? s.revenue / total : 0
    const seg = { ...s, pct, offset, dash: pct * circumference }
    offset += pct * circumference
    return seg
  })

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4" style={{color:'rgb(var(--text-primary))'}}>
        Ingresos por categoría — {getMonthName(month)}
      </h3>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="20"/>
            {segments.map((s, i) => (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                stroke={s.color} strokeWidth="20"
                strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                strokeDashoffset={-s.offset + circumference * 0.25}
                style={{transition:'all 0.5s ease'}}/>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs font-medium" style={{color:'rgb(var(--text-secondary))'}}>Total</p>
            <p className="text-sm font-bold" style={{color:'rgb(var(--text-primary))'}}>${total.toFixed(0)}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium truncate" style={{color:'rgb(var(--text-primary))'}}>{s.category}</p>
                  <p className="text-xs font-semibold ml-2 shrink-0" style={{color:s.color}}>${s.revenue.toFixed(2)}</p>
                </div>
                <div className="w-full h-1 rounded-full mt-1" style={{background:'rgba(0,0,0,0.06)'}}>
                  <div className="h-full rounded-full" style={{width:`${s.pct*100}%`,background:s.color}}/>
                </div>
              </div>
              <span className="text-[10px] shrink-0" style={{color:'rgb(var(--text-secondary))'}}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
