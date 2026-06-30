import { useState, useEffect } from 'react'

interface Template { id: string; name: string; category: string; price: number }
interface Props {
  onSelect: (t: Template) => void
  onClose: () => void
}

const CATEGORIES = ['Logo','Redes sociales','Web','Impresión','Presentación','Video','Otro']

export default function TemplatesPanel({ onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [price, setPrice] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const t = await window.electronAPI.listTemplates()
    setTemplates(t)
  }

  async function create() {
    if (!name.trim()) return
    await window.electronAPI.createTemplate({ name: name.trim(), category, price: parseFloat(price)||0 })
    setName(''); setPrice(''); setShowForm(false); load()
  }

  async function del(id: string) {
    await window.electronAPI.deleteTemplate(id); load()
  }

  return (
    <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog-panel p-6 max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{color:'rgb(var(--text-primary))'}}>Plantillas</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {templates.length === 0 && !showForm ? (
          <p className="text-sm text-center py-4" style={{color:'rgb(var(--text-secondary))'}}>
            Sin plantillas. Crea una para agilizar el proceso.
          </p>
        ) : (
          <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl group cursor-pointer"
                style={{background:'rgba(255,255,255,0.35)'}}
                onClick={() => { onSelect(t); onClose() }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{color:'rgb(var(--text-primary))'}}>{t.name}</p>
                  <p className="text-[11px]" style={{color:'rgb(var(--text-secondary))'}}>{t.category}</p>
                </div>
                {t.price > 0 && (
                  <span className="text-xs font-semibold" style={{color:'rgb(29,158,117)'}}>
                    ${t.price.toFixed(2)}
                  </span>
                )}
                <button onClick={e => { e.stopPropagation(); del(t.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Nombre de la plantilla" className="input text-sm" autoFocus />
            <div className="flex gap-2">
              <select value={category} onChange={e => setCategory(e.target.value)} className="input text-sm flex-1">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={price} onChange={e => setPrice(e.target.value)}
                placeholder="$0.00" className="input text-sm w-24" type="number" min="0" step="0.50" />
            </div>
            <div className="flex gap-2">
              <button onClick={create} className="btn-primary text-sm flex-1">Guardar</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn-secondary text-sm w-full">
            + Nueva plantilla
          </button>
        )}
      </div>
    </div>
  )
}
