import { useState, useEffect } from 'react'
import { showToast } from './Toast'
import ColorPalette from './ColorPalette'

const CATEGORIES = ['Logo', 'Web', 'Redes', 'Packaging', 'Branding', 'Otro']

interface ProformaItem {
  id: string
  description: string
  category: string
  quantity: number
  price: number
}

interface Props {
  client: Client
  designs?: Design[]
  month?: number
  year?: number
  periodLabel?: string
  onClose: () => void
}

function designsToItems(designs: Design[]): ProformaItem[] {
  return designs
    .filter((d) => (d.price || 0) > 0)
    .map((d) => ({
      id: d.id,
      description: d.title,
      category: CATEGORIES.includes(d.category) ? d.category : 'Otro',
      quantity: 1,
      price: d.price || 0,
    }))
}

function filterByPeriod(designs: Design[], month?: number, year?: number): Design[] {
  if (!month || !year) return designs
  return designs.filter((d) => {
    const dd = new Date(d.design_date)
    return dd.getMonth() + 1 === month && dd.getFullYear() === year
  })
}

export default function ProformaDialog({ client, designs = [], month, year, periodLabel, onClose }: Props) {
  const [items, setItems] = useState<ProformaItem[]>([
    { id: '1', description: '', category: CATEGORIES[0], quantity: 1, price: 0 },
  ])
  const [notes, setNotes] = useState('')
  const [validDays, setValidDays] = useState(15)
  const [generating, setGenerating] = useState(false)
  const [savedProducts, setSavedProducts] = useState<Product[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [proformaColor, setProformaColor] = useState('#5046B5')
  const [showNewProductForm, setShowNewProductForm] = useState(false)

  const [manualName, setManualName] = useState('')
  const [manualCity, setManualCity] = useState('')

  const now = new Date()
  const proformaNum = `PRO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`
  const isGeneralClient = !client?.id

  useEffect(() => {
    window.electronAPI.listProducts().then(setSavedProducts)
    window.electronAPI.listPackages().then(setPackages)
  }, [])

  const periodDesigns = filterByPeriod(designs, month, year)
  const pendingDesigns = periodDesigns.filter((d) => !d.paid && (d.price || 0) > 0)
  const pricedDesigns = periodDesigns.filter((d) => (d.price || 0) > 0)

  const total = items.reduce((s, i) => s + i.quantity * i.price, 0)
  const validUntil = new Date(now.getTime() + validDays * 86400000)

  function addItem() {
    setItems((prev) => [...prev, {
      id: String(Date.now()), description: '', category: CATEGORIES[0], quantity: 1, price: 0,
    }])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateItem(id: string, field: keyof ProformaItem, value: string | number) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }

  function importDesigns(source: Design[], label: string) {
    const next = designsToItems(source)
    if (next.length === 0) {
      showToast('info', 'No hay diseños con precio para importar')
      return
    }
    setItems(next)
    showToast('success', `${next.length} ítem${next.length !== 1 ? 's' : ''} importado${next.length !== 1 ? 's' : ''} (${label})`)
  }

  async function handleCreateProduct(name: string, category: string, price: number) {
    const p = await window.electronAPI.createProduct({ name, category, price })
    setSavedProducts(prev => [...prev, p])
    setItems(prev => [...prev, {
      id: String(Date.now()), description: name, category: category || CATEGORIES[0], quantity: 1, price,
    }])
    setShowNewProductForm(false)
    showToast('success', 'Producto creado y agregado a la proforma')
  }

  const clientName = isGeneralClient ? (manualName || 'Cliente General') : client.name
  const clientCity = isGeneralClient ? manualCity : ''

  async function exportPDF() {
    setGenerating(true)
    try {
      const path = await window.electronAPI.generateProforma({
        client: isGeneralClient ? { name: clientName, company: '', email: '' } : client,
        items, notes, validDays, proformaNum,
        date: now.toISOString(), total,
        proformaColor,
        isGeneralClient,
        clientCity,
      })
      if (path) {
        showToast('success', 'Proforma exportada correctamente')
        onClose()
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      showToast('error', 'Error al generar proforma: ' + msg)
    }
    setGenerating(false)
  }

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog-panel p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'rgb(var(--text-primary))' }}>
              Nueva Proforma
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-secondary))' }}>
              {proformaNum} · {now.toLocaleDateString('es-ES')}
              {periodLabel ? ` · ${periodLabel}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{ background: isGeneralClient ? 'rgba(80,70,181,0.2)' : `linear-gradient(145deg,${client.color || '#6366f1'},${client.color || '#6366f1'}cc)` }}>
              {isGeneralClient ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(80,70,181,0.6)" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              ) : client.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {isGeneralClient ? (
                <div className="flex gap-2 flex-wrap">
                  <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="input text-sm flex-1 min-w-[140px]" />
                  <input type="text" value={manualCity} onChange={(e) => setManualCity(e.target.value)}
                    placeholder="Ciudad"
                    className="input text-sm w-28" />
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{client.name}</p>
                  {client.company && <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{client.company}</p>}
                  {client.email && <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{client.email}</p>}
                </>
              )}
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>Válida por</p>
              <div className="flex items-center gap-1 justify-end">
                <input type="number" value={validDays} onChange={(e) => setValidDays(parseInt(e.target.value) || 15)}
                  className="input text-xs w-14 text-center" min="1" max="90" />
                <span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>días</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--text-secondary))' }}>
                Vence: {validUntil.toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </div>

        {(designs.length > 0 || savedProducts.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {!isGeneralClient && pricedDesigns.length > 0 && (
              <button type="button" onClick={() => importDesigns(pricedDesigns, periodLabel || 'periodo visible')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'rgba(80,70,181,0.1)', color: 'rgb(80,70,181)' }}>
                Importar diseños{periodLabel ? ` de ${periodLabel}` : ''} ({pricedDesigns.length})
              </button>
            )}
            {!isGeneralClient && pendingDesigns.length > 0 && (
              <button type="button" onClick={() => importDesigns(pendingDesigns, 'pendientes de cobro')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'rgba(245,158,11,0.12)', color: 'rgb(180,120,0)' }}>
                Importar pendientes ({pendingDesigns.length})
              </button>
            )}
            {savedProducts.length > 0 && (
              <button type="button"
                onClick={() => importDesigns(savedProducts.map((p) => ({
                  id: p.id, title: p.name, category: p.category, price: p.price,
                  design_date: '', description: '', client_id: '', file_path: '', thumbnail_path: '',
                  sort_order: 0, file_name: '', created_at: '', notes: '', favorite: 0, paid: 0,
                  platform: '', platform_cost: 0,
                })), 'productos guardados')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'rgba(16,185,129,0.12)', color: 'rgb(16,185,129)' }}>
                Importar productos ({savedProducts.length})
              </button>
            )}
            {packages.length > 0 && (
              <PackageDropdown packages={packages} onSelect={(pkg) => {
                setItems(pkg.items.map((item) => ({
                  id: String(Date.now()) + Math.random(),
                  description: item.description,
                  category: item.category,
                  quantity: item.quantity,
                  price: item.price,
                })))
                showToast('success', `Paquete "${pkg.name}" cargado (${pkg.items.length} servicios)`)
              }} />
            )}
            <button type="button" onClick={() => setShowNewProductForm(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(139,92,246,0.1)', color: 'rgb(139,92,246)' }}>
              + Nuevo producto
            </button>
          </div>
        )}

        <div className="mb-4">
          <div className="grid grid-cols-[1fr_120px_60px_80px_32px] gap-2 mb-2 px-1">
            {['Descripción', 'Categoría', 'Cant.', 'Precio', ''].map((h) => (
              <p key={h} className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'rgb(var(--text-secondary))' }}>{h}</p>
            ))}
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_120px_60px_80px_32px] gap-2 items-center">
                <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Descripción del servicio" className="input text-sm" />
                <select value={item.category} onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                  className="input text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                  className="input text-sm text-center" min="1" />
                <input type="number" value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00" className="input text-sm text-right" min="0" step="0.50" />
                <button onClick={() => removeItem(item.id)} disabled={items.length === 1}
                  className="p-1 rounded-lg text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="btn-ghost text-xs mt-2">+ Agregar ítem</button>
        </div>

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas o términos adicionales (opcional)..."
          className="input text-sm w-full mb-4 resize-none" rows={2} />

        <div className="mb-4">
          <ColorPalette value={proformaColor} onChange={setProformaColor} label="Color de la proforma" />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl mb-5"
          style={{ background: `${proformaColor}14`, border: `0.5px solid ${proformaColor}33` }}>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: 'rgb(var(--text-secondary))' }}>
              {items.length} servicio{items.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgb(var(--text-secondary))' }}>
              Válida hasta {validUntil.toLocaleDateString('es-ES')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>Total</p>
            <p className="text-xl sm:text-2xl font-semibold" style={{ color: proformaColor, whiteSpace: 'nowrap' }}>
              ${total.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={exportPDF} disabled={generating || items.every((i) => !i.description)}
            className="btn-primary flex-1">
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Exportar PDF
              </>
            )}
          </button>
        </div>

        {/* Quick product creation form */}
        {showNewProductForm && (
          <NewProductForm
            onSave={handleCreateProduct}
            onCancel={() => setShowNewProductForm(false)}
          />
        )}
      </div>
    </div>
  )
}

function PackageDropdown({ packages, onSelect }: { packages: Package[]; onSelect: (pkg: Package) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
        style={{ background: 'rgba(236,72,153,0.1)', color: 'rgb(236,72,153)' }}>
        + Desde paquete ({packages.length})
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 z-20 py-1 max-h-48 overflow-y-auto">
            {packages.map((pkg) => (
              <button key={pkg.id} type="button" onClick={() => { onSelect(pkg); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                <span className="font-medium text-surface-900 dark:text-surface-100">{pkg.name}</span>
                <span className="text-surface-400 ml-2">{pkg.items.length} servicios</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NewProductForm({ onSave, onCancel }: { onSave: (name: string, category: string, price: number) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')

  return (
    <div className="dialog-overlay z-[60]" onClick={onCancel}>
      <div className="dialog-panel max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Nuevo producto/servicio</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="input" placeholder="Ej: Diseño de logo" autoFocus />
          </div>
          <div>
            <label className="label">Categoría</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
              className="input" placeholder="Ej: Branding" />
          </div>
          <div>
            <label className="label">Precio ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              className="input" placeholder="0.00" min="0" step="0.01" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onCancel} className="btn-secondary">Cancelar</button>
            <button onClick={() => onSave(name.trim(), category.trim(), parseFloat(price) || 0)}
              disabled={!name.trim()} className="btn-primary">Crear y agregar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
