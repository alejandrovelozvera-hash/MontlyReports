import { useState, useEffect } from 'react'
import { getMonthName } from '../utils/date'

interface Props { clientId: string }

export default function ActivityTimeline({ clientId }: Props) {
  const [designs, setDesigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const d = await window.electronAPI.getDesigns(clientId)
      const sorted = [...d].sort((a,b) => new Date(b.design_date).getTime() - new Date(a.design_date).getTime())
      setDesigns(sorted)
      setLoading(false)
    }
    load()
  }, [clientId])

  // Group by month
  const groups: Record<string, any[]> = {}
  designs.forEach(d => {
    const date = new Date(d.design_date)
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(d)
  })

  if (loading) return (
    <div className="flex items-center justify-center h-24">
      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'rgba(80,70,181,0.3)',borderTopColor:'rgb(80,70,181)'}}/>
    </div>
  )

  if (designs.length === 0) return (
    <p className="text-sm text-center py-6" style={{color:'rgb(var(--text-secondary))'}}>Sin historial</p>
  )

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {Object.entries(groups).sort(([a],[b]) => b.localeCompare(a)).map(([key, items]) => {
        const [year, month] = key.split('-')
        const total = items.reduce((s,d) => s+(d.price||0), 0)
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{color:'rgb(80,70,181)'}}>
                {getMonthName(parseInt(month))} {year}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[11px]" style={{color:'rgb(var(--text-secondary))'}}>{items.length} diseños</span>
                {total > 0 && <span className="text-[11px] font-semibold" style={{color:'rgb(29,158,117)'}}>${total.toFixed(2)}</span>}
              </div>
            </div>
            <div className="space-y-1.5 pl-3" style={{borderLeft:'2px solid rgba(80,70,181,0.15)'}}>
              {items.map(d => (
                <div key={d.id} className="flex items-center gap-2.5 p-2 rounded-xl"
                  style={{background:'rgba(255,255,255,0.3)'}}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:'rgb(80,70,181)'}}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{color:'rgb(var(--text-primary))'}}>{d.title}</p>
                    <p className="text-[10px]" style={{color:'rgb(var(--text-secondary))'}}>{d.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {d.price > 0 && (
                      <p className={`text-[11px] font-semibold ${d.paid ? 'text-emerald-500' : 'text-amber-500'}`}>
                        ${d.price.toFixed(2)}{d.paid ? ' ✓' : ''}
                      </p>
                    )}
                    <p className="text-[10px]" style={{color:'rgb(var(--text-secondary))'}}>
                      {new Date(d.design_date).getDate()}/{String(new Date(d.design_date).getMonth()+1).padStart(2,'0')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
