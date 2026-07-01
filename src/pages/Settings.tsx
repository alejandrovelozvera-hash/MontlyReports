import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { showToast } from '../components/Toast'

export default function Settings() {
  const { clients, loadClients } = useStore()
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [exportingClient, setExportingClient] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'company' | 'products' | 'packages' | 'template' | 'cloud'>('general')

  useEffect(() => { loadClients() }, [])

  const handleBackup = async () => {
    setBackingUp(true); setMessage(null)
    try {
      const path = await window.electronAPI.backupData()
      if (path) setMessage({ type: 'success', text: `Backup guardado en:\n${path}` })
    } catch (e: any) { setMessage({ type: 'error', text: e.message || 'Error al hacer backup' })
    } finally { setBackingUp(false) }
  }

  const handleRestore = async () => {
    setRestoring(true); setMessage(null)
    try {
      const success = await window.electronAPI.restoreData()
      if (success) setMessage({ type: 'success', text: 'Datos restaurados correctamente. Recarga la app para ver los cambios.' })
    } catch (e: any) { setMessage({ type: 'error', text: e.message || 'Error al restaurar' })
    } finally { setRestoring(false) }
  }

  const handleExportClient = async (clientId: string) => {
    setExportingClient(clientId); setMessage(null)
    try {
      const path = await window.electronAPI.exportClientData(clientId)
      if (path) setMessage({ type: 'success', text: `Cliente exportado en:\n${path}` })
    } catch (e: any) { setMessage({ type: 'error', text: e.message || 'Error al exportar' })
    } finally { setExportingClient(null) }
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h2 className="page-heading">Configuración</h2>
        <p className="text-sm text-surface-500 mt-1">Backup, empresa, productos y ajustes</p>
      </div>

      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-800">
        {(['general', 'company', 'products', 'packages', 'template', 'cloud'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`pb-2 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === t ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
            {t === 'general' ? 'General' : t === 'company' ? 'Empresa' : t === 'products' ? 'Productos' : t === 'packages' ? 'Paquetes' : t === 'template' ? 'Plantilla Proforma' : 'Supabase / Nube'}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6 max-w-lg">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Backup completo</h4>
                <p className="text-xs text-surface-400 mt-0.5">Toda la base de datos e imágenes</p>
              </div>
              <button onClick={handleBackup} disabled={backingUp} className="btn-primary text-sm">
                {backingUp ? 'Respaldando...' : 'Descargar backup'}
              </button>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Restaurar backup</h4>
                <p className="text-xs text-surface-400 mt-0.5">Selecciona un ZIP para restaurar</p>
              </div>
              <button onClick={handleRestore} disabled={restoring} className="btn-secondary text-sm">
                {restoring ? 'Restaurando...' : 'Restaurar'}
              </button>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Exportar cliente individual</h4>
            <p className="text-xs text-surface-400 mt-0.5">Exporta un cliente con todos sus diseños como ZIP</p>
            <div className="space-y-2">
              {clients.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-semibold" style={{ backgroundColor: c.color }}>{c.name.charAt(0)}</div>
                    <span className="text-sm text-surface-700 dark:text-surface-300">{c.name}</span>
                  </div>
                  <button onClick={() => handleExportClient(c.id)} disabled={exportingClient === c.id} className="btn-ghost text-xs">
                    {exportingClient === c.id ? 'Exportando...' : 'Exportar'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900'
            }`}>
              {message.text}
            </div>
          )}

          <div className="card p-5">
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Acerca de</h4>
            <p className="text-xs text-surface-400">
              Design Reports v1.0.0<br />
              Gestor mensual de diseños con generación de informes PDF.<br /><br />
              <strong>Atajos:</strong> Ctrl+1 Dashboard · Ctrl+2 Clientes · Ctrl+3 Config · Ctrl+? Ayuda
            </p>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-1" style={{color:'rgb(var(--text-primary))'}}>
              Exportación masiva
            </h3>
            <p className="text-xs mb-4" style={{color:'rgb(var(--text-secondary))'}}>
              Genera el informe PDF de todos los clientes del mes actual de una sola vez.
            </p>
            <BulkExportButton />
          </div>
        </div>
      )}

      {activeTab === 'company' && <CompanySettings />}
      {activeTab === 'products' && <ProductsManager />}
      {activeTab === 'packages' && <PackagesManager />}
      {activeTab === 'template' && <ProformaTemplateManager />}
      {activeTab === 'cloud' && <SupabaseMigration />}
    </div>
  )
}

function CompanySettings() {
  const [companyName, setCompanyName] = useState('')
  const [ruc, setRuc] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [name, r, p, w, logo] = await Promise.all([
        window.electronAPI.getSetting('company_name'),
        window.electronAPI.getSetting('company_ruc'),
        window.electronAPI.getSetting('company_phone'),
        window.electronAPI.getSetting('company_website'),
        window.electronAPI.getSetting('company_logo_path'),
      ])
      if (name) setCompanyName(name)
      if (r) setRuc(r)
      if (p) setPhone(p)
      if (w) setWebsite(w)
      if (logo) setLogoPreview(window.electronAPI.getImageUrl(logo))
    }
    load()
  }, [])

  const handleSelectLogo = async () => {
    const path = await window.electronAPI.selectImage()
    if (path) {
      const savedPath = await window.electronAPI.setCompanyLogo(path)
      setLogoPreview(window.electronAPI.getImageUrl(savedPath))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await Promise.all([
      window.electronAPI.setSetting('company_name', companyName.trim()),
      window.electronAPI.setSetting('company_ruc', ruc.trim()),
      window.electronAPI.setSetting('company_phone', phone.trim()),
      window.electronAPI.setSetting('company_website', website.trim()),
    ])
    setSaving(false)
    showToast('success', 'Datos de empresa guardados')
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="card-flat">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">Datos de la empresa</h4>
        <div className="space-y-4">
          <div>
            <label className="label">Logo</label>
            <button type="button" onClick={handleSelectLogo}
              className="w-full h-24 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl flex flex-col items-center justify-center gap-1 text-surface-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-full object-contain" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  <span className="text-xs">Seleccionar logo</span>
                </>
              )}
            </button>
          </div>
          <div>
            <label className="label">Razón Social</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              className="input" placeholder="Ej: Mi Estudio Creativo S.A.C." />
          </div>
          <div>
            <label className="label">RUC</label>
            <input type="text" value={ruc} onChange={(e) => setRuc(e.target.value)}
              className="input" placeholder="Ej: 20123456789" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="input" placeholder="Ej: +51 987 654 321" />
          </div>
          <div>
            <label className="label">Sitio web</label>
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
              className="input" placeholder="Ej: www.miestudio.com" />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : 'Guardar datos'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  async function loadProducts() {
    setLoading(true)
    const p = await window.electronAPI.listProducts()
    setProducts(p)
    setLoading(false)
  }

  useEffect(() => { loadProducts() }, [])

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este producto/servicio?')) return
    await window.electronAPI.deleteProduct(id)
    loadProducts()
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Productos y Servicios</h4>
        <button onClick={() => { setEditProduct(null); setShowForm(true) }} className="btn-primary text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-surface-400">No hay productos o servicios registrados</p>
          <p className="text-xs text-surface-400 mt-1">Crea productos para usarlos rápidamente en proformas</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{p.name}</p>
                {p.category && <p className="text-xs text-surface-400">{p.category}</p>}
              </div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">${p.price.toFixed(2)}</p>
              <button onClick={() => { setEditProduct(p); setShowForm(true) }}
                className="btn-ghost text-xs p-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button onClick={() => handleDelete(p.id)}
                className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editProduct}
          onSave={() => { setShowForm(false); setEditProduct(null); loadProducts() }}
          onClose={() => { setShowForm(false); setEditProduct(null) }}
        />
      )}
    </div>
  )
}

function ProductForm({ product, onSave, onClose }: { product: Product | null; onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState(product?.name || '')
  const [category, setCategory] = useState(product?.category || '')
  const [price, setPrice] = useState(String(product?.price || ''))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (product) {
        await window.electronAPI.updateProduct(product.id, { name: name.trim(), category: category.trim(), price: parseFloat(price) || 0 })
      } else {
        await window.electronAPI.createProduct({ name: name.trim(), category: category.trim(), price: parseFloat(price) || 0 })
      }
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej: Diseño de logo profesional" autoFocus required />
          </div>
          <div>
            <label className="label">Categoría</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="input" placeholder="Ej: Branding, Web, Redes..." />
          </div>
          <div>
            <label className="label">Precio ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="0.00" min="0" step="0.01" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={!name.trim() || saving} className="btn-primary">
              {saving ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PackagesManager() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPkg, setEditPkg] = useState<Package | null>(null)

  async function loadPackages() {
    setLoading(true)
    const p = await window.electronAPI.listPackages()
    setPackages(p)
    setLoading(false)
  }

  useEffect(() => { loadPackages() }, [])

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este paquete/plan?')) return
    await window.electronAPI.deletePackage(id)
    loadPackages()
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Paquetes y Planes</h4>
        <button onClick={() => { setEditPkg(null); setShowForm(true) }} className="btn-primary text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : packages.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-surface-400">No hay paquetes o planes registrados</p>
          <p className="text-xs text-surface-400 mt-1">Crea paquetes para agrupar servicios y usarlos en proformas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => {
            const total = pkg.items.reduce((s, i) => s + i.quantity * i.price, 0)
            return (
              <div key={pkg.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{pkg.name}</p>
                    {pkg.description && <p className="text-xs text-surface-400 truncate">{pkg.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${total.toFixed(2)}</span>
                    <button onClick={() => { setEditPkg(pkg); setShowForm(true) }}
                      className="btn-ghost text-xs p-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(pkg.id)}
                      className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
                {pkg.items.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-surface-100 dark:border-surface-800">
                    {pkg.items.map((item, i) => (
                      <div key={item.id || i} className="flex items-center justify-between text-xs py-1">
                        <span className="text-surface-700 dark:text-surface-300 truncate">{item.description}</span>
                        <span className="text-surface-400 ml-2 shrink-0">{item.quantity}x ${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <PackageForm
          pkg={editPkg}
          onSave={() => { setShowForm(false); setEditPkg(null); loadPackages() }}
          onClose={() => { setShowForm(false); setEditPkg(null) }}
        />
      )}
    </div>
  )
}

function PackageForm({ pkg, onSave, onClose }: { pkg: Package | null; onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState(pkg?.name || '')
  const [description, setDescription] = useState(pkg?.description || '')
  const [items, setItems] = useState<{ description: string; category: string; quantity: number; price: number }[]>(
    pkg?.items.map(i => ({ description: i.description, category: i.category, quantity: i.quantity, price: i.price })) || [{ description: '', category: '', quantity: 1, price: 0 }]
  )
  const [saving, setSaving] = useState(false)

  function updateItem(idx: number, field: string, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  function addItem() {
    setItems(prev => [...prev, { description: '', category: '', quantity: 1, price: 0 }])
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const total = items.reduce((s, i) => s + i.quantity * i.price, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        items: items.filter(i => i.description.trim()),
      }
      if (pkg) {
        await window.electronAPI.updatePackage(pkg.id, payload)
      } else {
        await window.electronAPI.createPackage(payload)
      }
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {pkg ? 'Editar paquete' : 'Nuevo paquete'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej: Plan Social Media" autoFocus required />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Ej: Paquete completo de redes sociales" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Servicios incluidos</label>
              <button type="button" onClick={addItem} className="btn-ghost text-xs">+ Agregar servicio</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="input text-sm flex-1 min-w-0" placeholder="Descripción" />
                  <input type="number" value={item.quantity || ''} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                    className="input text-sm w-14 text-center" min="1" />
                  <input type="number" value={item.price || ''} onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00" className="input text-sm w-20 text-right" min="0" step="0.50" />
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                    className="p-1 rounded-lg text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-800">
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">Total: <span className="text-emerald-600 dark:text-emerald-400">${total.toFixed(2)}</span></p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={!name.trim() || saving} className="btn-primary">
              {saving ? 'Guardando...' : pkg ? 'Guardar cambios' : 'Crear paquete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProformaTemplateManager() {
  const [templateInfo, setTemplateInfo] = useState<{ path: string | null; previewPath: string | null; exists: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  async function load() {
    setLoading(true)
    const info = await window.electronAPI.getProformaTemplate()
    setTemplateInfo(info)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleUpload() {
    setUploading(true)
    try {
      const result = await window.electronAPI.uploadProformaTemplate()
      if (result) setTemplateInfo(result)
      if (result?.warning) alert(result.warning)
    } finally { setUploading(false) }
  }

  async function handleRemove() {
    if (!window.confirm('¿Eliminar la plantilla de proforma?')) return
    await window.electronAPI.removeProformaTemplate()
    setTemplateInfo({ path: null, previewPath: null, exists: false })
  }

  if (loading) return <div className="space-y-4"><div className="h-12 skeleton rounded-xl w-64" /><div className="h-64 skeleton rounded-2xl" /></div>

  return (
    <div className="space-y-5 max-w-lg">
      <div className="card-flat">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Plantilla de Proforma</h4>
        <p className="text-xs text-surface-400 mb-4">
          Sube un diseño creado en Affinity (PDF, PNG o JPG). Será usado como fondo de todas las proformas.
          El texto (cliente, productos, totales) se agregará automáticamente encima.
        </p>

        {templateInfo?.exists ? (
          <div className="space-y-4">
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
              <img src={window.electronAPI.getImageUrl(templateInfo.previewPath || '')}
                alt="Plantilla" className="w-full object-contain max-h-80" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpload} disabled={uploading} className="btn-secondary text-sm">
                {uploading ? 'Subiendo...' : 'Reemplazar plantilla'}
              </button>
              <button onClick={handleRemove} className="btn-secondary text-sm text-red-500 hover:text-red-700">
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-surface-400 text-center">Ninguna plantilla seleccionada</p>
            <button onClick={handleUpload} disabled={uploading} className="btn-primary text-sm">
              {uploading ? 'Subiendo...' : 'Subir diseño desde Affinity'}
            </button>
          </div>
        )}
      </div>

      <div className="card-flat">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-2">Posiciones de los campos</h4>
        <p className="text-xs text-surface-400 mb-3">
          Los datos se colocan automáticamente en estas posiciones. Diseña tu plantilla dejando espacios en blanco aquí:
        </p>
        <div className="bg-surface-50 dark:bg-surface-900 rounded-xl p-4 text-xs font-mono text-surface-600 dark:text-surface-400 space-y-1">
          <div className="font-semibold text-surface-800 dark:text-surface-200 mb-2">Referencia A4 (210×297mm):</div>
          <div>y=14-55: Área libre — tu diseño (logo, colores, nombre empresa)</div>
          <div>y=60: "PROFORMA" + número</div>
          <div>y=60: Fecha (derecha)</div>
          <div>y=72: Nombre del cliente</div>
          <div>y=78: Ciudad del cliente</div>
          <div>y=88: Tabla — encabezado (Descripción, Cat, Cant, P.Unit, Total)</div>
          <div>y=96: Primera fila de productos</div>
          <div>y+6: Cada fila adicional</div>
          <div>variable: Barra de TOTAL</div>
          <div>y=283: Footer (número proforma, validez)</div>
        </div>
        <p className="text-xs text-surface-400 mt-3">
          Las posiciones son fijas. Diseña tu template alrededor de estos espacios para texto.
        </p>
      </div>
    </div>
  )
}

function SupabaseMigration() {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [supabaseMode, setSupabaseMode] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(true)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  useEffect(() => {
    Promise.all([
      window.electronAPI.getMigrationConfig(),
      window.electronAPI.getSupabaseMode(),
    ]).then(([cfg, mode]) => {
      if (cfg.supabaseUrl) setUrl(cfg.supabaseUrl)
      if (cfg.supabaseAnonKey) setAnonKey(cfg.supabaseAnonKey)
      setSupabaseMode(mode)
      setToggleLoading(false)
    })
  }, [])

  async function handleSave() {
    await window.electronAPI.saveMigrationConfig(url, anonKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleMigrate() {
    if (!url || !anonKey) return
    setMigrating(true)
    setLogs([])
    try {
      const result = await window.electronAPI.runMigration(url, anonKey)
      setLogs(result)
    } catch (e: any) {
      setLogs((prev) => [...prev, `ERROR: ${e.message || e}`])
    } finally {
      setMigrating(false)
    }
  }

  async function handleUploadFiles() {
    if (!url || !anonKey) return
    setUploadingFiles(true)
    setLogs([])
    try {
      const result = await window.electronAPI.uploadPendingFiles()
      setLogs(result)
    } catch (e: any) {
      setLogs(prev => [...prev, `ERROR: ${e.message || e}`])
    } finally {
      setUploadingFiles(false)
    }
  }

  async function handleToggleMode() {
    const newMode = !supabaseMode
    await window.electronAPI.setSupabaseMode(newMode)
    const actualMode = await window.electronAPI.getSupabaseMode()
    setSupabaseMode(actualMode)
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="card-flat space-y-4">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Supabase / Nube</h4>
        <p className="text-xs text-surface-400">
          Conecta la aplicación a Supabase para mantener los datos sincronizados entre computadoras.
        </p>

        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
          <div>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-100">Modo nube</p>
            <p className="text-xs text-surface-400">
              {supabaseMode ? 'Leyendo datos desde Supabase' : 'Usando base de datos local'}
            </p>
          </div>
          {toggleLoading ? (
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <button
              onClick={handleToggleMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${supabaseMode ? 'bg-indigo-500' : 'bg-surface-300 dark:bg-surface-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${supabaseMode ? 'translate-x-5' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="card-flat space-y-4">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Migrar datos a Supabase</h4>
        <p className="text-xs text-surface-400">
          Sube tus datos locales a Supabase para acceder desde cualquier computadora.
        </p>
        <ol className="text-xs text-surface-500 space-y-1 list-decimal pl-4">
          <li>Crea un proyecto gratis en <strong>supabase.com</strong></li>
          <li>Ve a Settings → API y copia <strong>Project URL</strong> y <strong>anon public key</strong></li>
          <li>Ve a SQL Editor, pega el contenido de <strong>src/supabase/schema.sql</strong> y ejecútalo</li>
          <li>Configura las credenciales abajo y haz clic en "Migrar"</li>
        </ol>
        <div className="space-y-3">
          <div>
            <label className="label">Supabase Project URL</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              className="input" placeholder="https://xxxx.supabase.co" />
          </div>
          <div>
            <label className="label">Supabase Anon Key</label>
            <input type="text" value={anonKey} onChange={(e) => setAnonKey(e.target.value)}
              className="input font-mono text-xs" placeholder="eyJhbGciOiJIUzI1NiIs..." />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleSave} className="btn-secondary text-sm">
              {saved ? 'Guardado ✓' : 'Guardar configuración'}
            </button>
            <button onClick={handleMigrate} disabled={migrating || !url || !anonKey} className="btn-primary text-sm">
              {migrating ? 'Migrando...' : 'Migrar a Supabase'}
            </button>
            <button onClick={handleUploadFiles} disabled={uploadingFiles || !url || !anonKey} className="btn-secondary text-sm">
              {uploadingFiles ? 'Subiendo...' : 'Subir archivos pendientes'}
            </button>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card p-4 bg-surface-50 dark:bg-surface-800/50">
          <h5 className="text-xs font-semibold text-surface-600 dark:text-surface-400 mb-2">Progreso:</h5>
          <div className="space-y-0.5 max-h-60 overflow-y-auto font-mono text-[11px] leading-relaxed">
            {logs.map((l, i) => (
              <p key={i} className={l.startsWith('ERROR') ? 'text-red-500' : 'text-surface-500 dark:text-surface-400'}>
                {l}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BulkExportButton() {
  const { clients } = useStore()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  async function exportAll() {
    if (!clients.length) return
    setLoading(true)
    setProgress([])
    for (const c of clients) {
      try {
        setProgress(p => [...p, `Generando ${c.name}...`])
        await window.electronAPI.generateReport({
          clientId: c.id, month, year,
          message: '', color: c.color || '#6366f1',
          template: 'classic', watermark: ''
        })
        setProgress(p => [...p.slice(0,-1), `✓ ${c.name}`])
      } catch {
        setProgress(p => [...p.slice(0,-1), `✗ ${c.name} (sin diseños)`])
      }
    }
    setLoading(false)
  }

  return (
    <div>
      <button onClick={exportAll} disabled={loading} className="btn-primary text-sm">
        {loading ? 'Exportando...' : `📄 Exportar ${clients.length} informes`}
      </button>
      {progress.length > 0 && (
        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
          {progress.map((p,i) => (
            <p key={i} className="text-xs" style={{color: p.startsWith('✓') ? 'rgb(29,158,117)' : p.startsWith('✗') ? 'rgb(239,68,68)' : 'rgb(var(--text-secondary))'}}>{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}
