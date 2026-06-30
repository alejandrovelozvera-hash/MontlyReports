import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getMonthName, getCurrentYear } from '../utils/date'

export default function StatsChart() {
  const { clients } = useStore()
  const [data, setData] = useState<{ month: number; count: number }[]>([])
  const year = getCurrentYear()

  useEffect(() => {
    async function load() {
      const months = Array.from({ length: 6 }, (_, i) => {
        const m = new Date().getMonth() + 1 - (5 - i)
        return m <= 0 ? m + 12 : m
      })
      // Fix: cargar en paralelo todos los meses y clientes
      const matrix = await Promise.all(
        months.map((m) => Promise.all(clients.map((c) => window.electronAPI.getDesignsByMonth(c.id, m, year))))
      )
      const results = months.map((m, mi) => ({
        month: m,
        count: matrix[mi].reduce((s, d) => s + d.length, 0),
      }))
      setData(results)
    }
    if (clients.length > 0) load()
  }, [clients])

  if (data.length === 0) return null

  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="card p-5">
      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">Diseños últimos 6 meses</h4>
      <div className="flex items-end gap-3 h-32">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-xs text-surface-400">{d.count}</span>
            <div
              className="w-full rounded-md bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '2px' }}
            />
            <span className="text-[10px] text-surface-400 font-medium">{getMonthName(d.month).slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
