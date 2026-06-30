import { useEffect, useState } from 'react'
import ProformaDialog from './ProformaDialog'
import { getMonthName } from '../utils/date'

interface Props {
  clients: Client[]
  initialClient?: Client | null
  month?: number
  year?: number
  designs?: Design[]
  onClose: () => void
}

export default function ProformaFlow({ clients, initialClient, month, year, designs: presetDesigns, onClose }: Props) {
  const [client, setClient] = useState<Client | null>(initialClient ?? null)
  const [designs, setDesigns] = useState<Design[]>(presetDesigns ?? [])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!client || !client.id || presetDesigns) return
    setLoading(true)
    window.electronAPI.getDesigns(client.id).then((d) => {
      setDesigns(d)
      setLoading(false)
    })
  }, [client, presetDesigns])

  if (!client) {
    const filtered = clients.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
      <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="dialog-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-surface-200 dark:border-surface-800">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Nueva proforma</h3>
            <p className="text-sm text-surface-500 mt-1">Selecciona el cliente o crea sin cliente</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="relative">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..." className="input pl-9" autoFocus />
            </div>

            <button onClick={() => setClient({} as Client)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-dashed border-surface-300 dark:border-surface-600">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-500 font-semibold text-sm shrink-0 bg-indigo-50 dark:bg-indigo-950/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">Sin cliente</p>
                <p className="text-xs text-surface-500">Crear proforma sin registrar un cliente</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500 shrink-0">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {filtered.length === 0 ? (
                <p className="text-sm text-center text-surface-400 py-4">No hay clientes</p>
              ) : filtered.map((c) => (
                <button key={c.id} onClick={() => setClient(c)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
                    style={{ background: `linear-gradient(145deg, ${c.color}, ${c.color}cc)` }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{c.name}</p>
                    {c.company && <p className="text-xs text-surface-500 truncate">{c.company}</p>}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500 shrink-0">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-surface-200 dark:border-surface-800 flex justify-end">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dialog-overlay">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-surface-500">Cargando diseños de {client.name}...</p>
        </div>
      </div>
    )
  }

  return (
    <ProformaDialog
      client={client}
      designs={designs}
      month={month}
      year={year}
      periodLabel={month && year ? `${getMonthName(month)} ${year}` : undefined}
      onClose={onClose}
    />
  )
}
