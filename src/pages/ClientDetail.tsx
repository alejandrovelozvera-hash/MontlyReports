import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { getMonthName, getCurrentMonth, getCurrentYear, sameMonth, getYears } from '../utils/date'
import { showToast } from '../components/Toast'
import { loadCategories, saveCustomCategory, deleteCustomCategory, DEFAULT_CATEGORIES } from '../utils/categories'
import { loadPlatforms, saveCustomPlatform, deleteCustomPlatform, DEFAULT_PLATFORMS } from '../utils/platforms'
import UnifiedUploadDialog from '../components/UnifiedUploadDialog'
import PromptDialog from '../components/PromptDialog'
import ManageListDialog from '../components/ManageListDialog'
import UrlImportDialog from '../components/UrlImportDialog'
import ReportDialog from '../components/ReportDialog'
import TemplatesPanel from '../components/TemplatesPanel'
import PresentationMode from '../components/PresentationMode'
import ProformaFlow from '../components/ProformaFlow'
import FullScreenPreview from '../components/FullScreenPreview'
import DesignEditDialog from '../components/DesignEditDialog'

const CATEGORIES_DEFAULT = ['Logo', 'Web', 'Redes', 'Packaging', 'Branding', 'Otro']
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

type ViewMode = 'grid' | 'calendar'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { clients, deleteDesign, loadClients } = useStore()
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const client = clients.find((c) => c.id === id)
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [multiMonth, setMultiMonth] = useState(false)
  const [monthRange, setMonthRange] = useState(3)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showUploader, setShowUploader] = useState(false)
  const [showUrlImport, setShowUrlImport] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [editDesign, setEditDesign] = useState<Design | null>(null)
  const [compactView, setCompactView] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [paidFilter, setPaidFilter] = useState<'all'|'paid'|'unpaid'>('all')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showPresentation, setShowPresentation] = useState(false)
  const [showProforma, setShowProforma] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchCat, setBatchCat] = useState('')
  const [categories, setCategories] = useState(CATEGORIES_DEFAULT)
  const [platforms, setPlatforms] = useState(DEFAULT_PLATFORMS)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showPromptPlatform, setShowPromptPlatform] = useState(false)
  const [showManage, setShowManage] = useState<'categories' | 'platforms' | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const d = await window.electronAPI.getDesigns(id)
    setDesigns(d)
    setLoading(false)
  }, [id])

  useEffect(() => { loadClients() }, [])
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { if (searchParams.get('report') === '1') setShowReport(true) }, [searchParams])
  useEffect(() => { if (searchParams.get('proforma') === '1') setShowProforma(true) }, [searchParams])
  useEffect(() => { loadCategories().then(setCategories) }, [])
  useEffect(() => { loadPlatforms().then(setPlatforms) }, [])

  async function handleAddCategory(name: string) {
    await saveCustomCategory(name)
    setCategories(await loadCategories())
    setShowPrompt(false)
  }

  async function handleAddPlatform(name: string) {
    await saveCustomPlatform(name)
    setPlatforms(await loadPlatforms())
    setShowPromptPlatform(false)
  }

  let visible = designs
  if (!multiMonth) {
    visible = designs.filter((d) => sameMonth(d.design_date, month, year))
  } else {
    const monthsBack = monthRange
    const current = new Date(year, month - 1)
    const start = new Date(current.getFullYear(), current.getMonth() - monthsBack + 1, 1)
    visible = designs.filter((d) => {
      const dd = new Date(d.design_date)
      return dd >= start && dd <= current
    })
  }

  if (selectedTags.length > 0) {
    visible = visible.filter((d) => selectedTags.includes(d.category))
  }

  const toggleTag = (t: string) => setSelectedTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])

  const handleDelete = async (designId: string) => {
    const design = designs.find((d) => d.id === designId)
    if (!window.confirm(`¿Eliminar "${design?.title || 'este diseño'}"? Esta acción no se puede deshacer.`)) return
    await deleteDesign(designId)
    loadData()
  }

  const handleEditSave = async (designId: string, data: { title: string; description: string; category: string; notes: string; price: number; design_date: string }) => {
    await window.electronAPI.updateDesign(designId, data)
    loadData()
  }

  const handleExportImage = async (designId: string) => {
    await window.electronAPI.exportDesignImage(designId)
  }

  const handleToggleFavorite = async (designId: string) => {
    await window.electronAPI.toggleFavorite(designId)
    loadData()
  }

  const handleMoveUp = async (i: number) => {
    if (i === 0) return
    const items = [...visible]
    const tmp = items[i]; items[i] = items[i - 1]; items[i - 1] = tmp
    await window.electronAPI.batchReorder(items.map((d, idx) => ({ id: d.id, sortOrder: idx })))
    loadData()
  }

  const handleMoveDown = async (i: number) => {
    if (i === visible.length - 1) return
    const items = [...visible]
    const tmp = items[i]; items[i] = items[i + 1]; items[i + 1] = tmp
    await window.electronAPI.batchReorder(items.map((d, idx) => ({ id: d.id, sortOrder: idx })))
    loadData()
  }

  // Drag & drop
  const handleDragStart = (i: number) => { dragItem.current = i }
  const handleDragEnter = (i: number) => { dragOver.current = i }
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) {
      dragItem.current = null; dragOver.current = null; return
    }
    const items = [...visible]
    const [moved] = items.splice(dragItem.current, 1)
    items.splice(dragOver.current, 0, moved)
    await window.electronAPI.batchReorder(items.map((d, idx) => ({ id: d.id, sortOrder: idx })))
    dragItem.current = null; dragOver.current = null
    loadData()
  }

  const handleTogglePaid = async (designId: string) => {
    await window.electronAPI.toggleDesignPaid(designId)
    loadData()
  }

  const handleBatchDelete = async () => {
    if (!window.confirm(`¿Eliminar ${selected.size} diseño${selected.size !== 1 ? 's' : ''} seleccionado${selected.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return
    for (const sid of selected) await deleteDesign(sid)
    setSelected(new Set())
    loadData()
  }

  const handleBatchCategorize = async () => {
    if (!batchCat) return
    for (const sid of selected) await window.electronAPI.updateDesign(sid, { category: batchCat })
    setSelected(new Set())
    loadData()
  }

  const toggleSelect = (designId: string) => {
    setSelected((p) => {
      const next = new Set(p)
      if (next.has(designId)) next.delete(designId); else next.add(designId)
      return next
    })
  }

  const handleGenerate = async (message: string, color: string, template: 'classic' | 'minimal' | 'modern', watermark: string) => {
    if (!id) return
    setGenerating(true)
    try {
      const result = await window.electronAPI.generateReport({ clientId: id, month, year, message, color, template, watermark })
      if (result) {
        showToast('success', `PDF guardado en la ubicación seleccionada`)
        window.electronAPI.openFolder(result)
      }
    } catch (err: any) {
      showToast('error', `Error al generar PDF: ${err.message || 'desconocido'}`)
    } finally { setGenerating(false) }
  }

  const handleExportZip = async () => {
    if (!id) return
    setZipping(true)
    try {
      const result = await window.electronAPI.exportClientZip(id, month, year)
      if (result) showToast('success', 'ZIP exportado correctamente')
    } catch (err: any) {
      showToast('error', `Error al exportar ZIP: ${err.message || 'desconocido'}`)
    } finally { setZipping(false) }
  }

  const handleExportGallery = async () => {
    if (!id) return
    try {
      const path = await window.electronAPI.exportGalleryHtml(id, month, year)
      if (path) { showToast('success', 'Galería HTML generada'); window.electronAPI.openFolder(path) }
    } catch (err: any) {
      showToast('error', `Error al generar galería: ${err.message || 'desconocido'}`)
    }
  }

  const handleUrlImport = async (data: any) => {
    await window.electronAPI.createDesign(data)
    loadData()
  }

  const handleUnifiedUpload = async (items: { path: string; name: string; title: string; category: string; price: number; platform: string; platform_cost: number }[]) => {
    for (const item of items) {
      await window.electronAPI.createDesign({
        clientId: id!, title: item.title, category: item.category,
        filePath: item.path, fileName: item.name, designDate: `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
        price: item.price,
        platform: item.platform,
        platform_cost: item.platform_cost,
      })
    }
    loadData()
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="card p-8 text-center">
          <p className="text-surface-500 mb-4">Cliente no encontrado</p>
          <button onClick={() => navigate('/clients')} className="btn-secondary">Volver</button>
        </div>
      </div>
    )
  }

  const monthName = getMonthName(month)
  const years = getYears()

  // Calendar data
  const daysInMonth = new Date(year, month, 0).getDate()
  const calendarDesigns: Record<number, Design[]> = {}
  visible.forEach((d) => {
    const day = new Date(d.design_date).getDate()
    if (!calendarDesigns[day]) calendarDesigns[day] = []
    calendarDesigns[day].push(d)
  })

  return (
    <div className="space-y-5 page-enter">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-surface-400">
        <button onClick={() => navigate('/clients')} className="hover:text-surface-600 dark:hover:text-surface-300 transition-colors">Clientes</button>
        <span>/</span>
        <span className="font-medium" style={{color: client.color}}>{client.name}</span>
      </nav>
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: client.color }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{color: client.color}}>{client.name}</h2>
              <div className="flex items-center gap-3 mt-0.5">
                {client.company && <p className="text-sm text-surface-400">{client.company}</p>}
                {client.email && <p className="text-sm text-surface-400">{client.email}</p>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Month / actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {multiMonth ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-400">Últimos</span>
              <select value={monthRange} onChange={(e) => setMonthRange(Number(e.target.value))} className="input w-16 text-sm">
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={6}>6</option>
                <option value={12}>12</option>
              </select>
              <span className="text-sm text-surface-400">meses</span>
            </div>
          ) : (
            <>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input w-auto">
                {MONTHS.map((m) => <option key={m} value={m}>{getMonthName(m)}</option>)}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-auto">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          <button onClick={() => setMultiMonth(!multiMonth)} className={`btn-ghost text-xs ${multiMonth ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
            {multiMonth ? 'Mes único' : 'Multimes'}
          </button>
          <div className="flex border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 text-xs ${viewMode === 'grid' ? 'bg-surface-100 dark:bg-surface-700 text-surface-900 dark:text-surface-100' : 'text-surface-400 hover:text-surface-600'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            </button>
            <button onClick={() => setViewMode('calendar')} className={`px-2.5 py-1.5 text-xs ${viewMode === 'calendar' ? 'bg-surface-100 dark:bg-surface-700 text-surface-900 dark:text-surface-100' : 'text-surface-400 hover:text-surface-600'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </button>
          </div>
          <span className="text-sm text-surface-400 ml-2">{visible.length} diseño{visible.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setCompactView(v => !v)}
            className="ml-2 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title={compactView ? 'Vista cómoda' : 'Vista compacta'}>
            {compactView
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
          {visible.reduce((s, d) => s + (d.price || 0), 0) > 0 && (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
              · ${visible.reduce((s, d) => s + (d.price || 0), 0).toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(true)} className="btn-secondary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            Plantillas
          </button>
          <button onClick={() => setShowUploader(true)} className="btn-primary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Subir
          </button>
          <button onClick={() => setShowUrlImport(true)} className="btn-secondary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            URL
          </button>
          <button onClick={() => setShowPresentation(true)} className="btn-secondary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Presentar
          </button>
          <button onClick={() => setShowProforma(true)} className="btn-secondary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
            </svg>
            Proforma
          </button>
          <button onClick={() => setShowReport(true)} className="btn-secondary text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            Informe
          </button>
        </div>
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
          <select value={batchCat} onChange={(e) => {
              if (e.target.value === '__add__') { setShowPrompt(true); return }
              if (e.target.value === '__manage__') { setShowManage('categories'); return }
              setBatchCat(e.target.value)
            }} className="input w-auto text-xs h-8">
            <option value="">Cambiar categoría...</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__add__" className="text-indigo-500 font-medium">+ Añadir categoría…</option>
            <option value="__manage__" className="text-indigo-500 font-medium">⚙ Gestionar categorías</option>
          </select>
          {showPrompt && <PromptDialog title="Nueva categoría" placeholder="Nombre de la categoría" onConfirm={handleAddCategory} onCancel={() => setShowPrompt(false)} />}
          {showPromptPlatform && <PromptDialog title="Nueva plataforma" placeholder="Nombre de la plataforma" onConfirm={handleAddPlatform} onCancel={() => setShowPromptPlatform(false)} />}
          {batchCat && <button onClick={handleBatchCategorize} className="btn-primary text-xs h-8">Aplicar</button>}
          <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs">Limpiar</button>
          <button onClick={handleBatchDelete} className="btn-danger text-xs ml-auto">Borrar seleccionados</button>
        </div>
      )}

      {/* Paid filter + Category filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Segmented control Todos/Cobrados/Pendientes */}
        <div className="seg-ctrl">
          {([['all','Todos'], ['paid','Cobrados'], ['unpaid','Pendientes']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setPaidFilter(val)}
              className={`seg-btn ${paidFilter === val ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
        <div style={{width:'1px', height:'20px', background:'var(--glass-border)'}} />
        {/* Filtros de categoría */}
        <button onClick={() => setSelectedTags([])}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedTags.length === 0
              ? 'text-indigo-700 dark:text-indigo-300'
              : 'text-surface-400 hover:text-surface-600'
          }`}
          style={selectedTags.length === 0 ? {background:'rgba(80,70,181,0.1)'} : {}}>
          Todos
        </button>
        {categories.map((cat) => {
          const count = designs.filter((d) => d.category === cat).length
          if (count === 0) return null
          return (
            <button key={cat} onClick={() => toggleTag(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedTags.includes(cat) ? 'text-indigo-700 dark:text-indigo-300' : 'text-surface-400 hover:text-surface-600'
              }`}
              style={selectedTags.includes(cat) ? {background:'rgba(80,70,181,0.1)'} : {}}>
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-10 skeleton rounded-xl w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 rounded-2xl skeleton" />)}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          </div>
          <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Sin diseños</h4>
          <p className="text-sm text-surface-400 mb-4">
            {multiMonth ? 'No hay diseños en este período' : `No hay diseños para ${monthName} ${year}`}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => setShowUploader(true)} className="btn-primary">Subir diseños</button>
            <button onClick={() => setShowUrlImport(true)} className="btn-secondary">Desde URL</button>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar view */
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-surface-200 dark:border-surface-700">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-surface-400 bg-surface-50 dark:bg-surface-800/50">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] p-1 border-b border-r border-surface-100 dark:border-surface-800" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dayDesigns = calendarDesigns[day] || []
              return (
                <div key={day} className={`min-h-[80px] p-1 border-b border-r border-surface-100 dark:border-surface-800 ${dayDesigns.length > 0 ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''}`}>
                  <span className="text-xs font-medium text-surface-500 dark:text-surface-400">{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayDesigns.slice(0, 3).map((d) => (
                      <button key={d.id} onClick={() => setPreviewIndex(visible.indexOf(d))}
                        className="w-full text-left text-[10px] truncate rounded px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                        {d.title}
                      </button>
                    ))}
                    {dayDesigns.length > 3 && <p className="text-[10px] text-surface-400 px-1">+{dayDesigns.length - 3} más</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((d, i) => (
            <div key={d.id} draggable onDragStart={() => handleDragStart(i)} onDragEnter={() => handleDragEnter(i)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}
              className={`card group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${selected.has(d.id) ? 'ring-2 ring-indigo-500' : ''} ${d.platform ? 'ring-2 ring-indigo-400/50 dark:ring-indigo-500/50' : ''} ${dragOver.current === i ? 'opacity-60 scale-95' : ''}`}>
              <div className="relative">
                <button onClick={() => setPreviewIndex(i)} className="w-full min-h-[200px] bg-surface-100 dark:bg-surface-800 relative flex items-center justify-center">
                  <img src={window.electronAPI.getImageUrl(d.thumbnail_path || d.file_path)} alt={d.title}
                    className="w-full h-auto max-h-[300px] object-contain transition-transform duration-300 group-hover:scale-105" />
                  {d.category && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm">
                      {d.category}
                    </span>
                  )}
                  {d.favorite === 1 && (
                    <span className="absolute top-2 right-8 text-yellow-400 drop-shadow-sm">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </span>
                  )}
                  {d.platform && (
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-indigo-500/80 text-white text-[9px] font-semibold backdrop-blur-sm flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      {d.platform}
                    </span>
                  )}
                </button>
                <button onClick={() => toggleSelect(d.id)}
                  className={`absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    selected.has(d.id)
                      ? 'bg-indigo-500 text-white'
                      : 'bg-black/30 text-white/70 hover:bg-black/50 opacity-0 group-hover:opacity-100'
                  }`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{d.title}</p>
                    {d.description && <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{d.description}</p>}
                    {d.notes && <p className="text-[10px] text-amber-500 mt-0.5 truncate">📝 {d.notes}</p>}
                    {d.platform && (
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5 truncate">
                        {d.platform}{d.platform_cost > 0 ? ` · $${d.platform_cost.toFixed(2)}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleToggleFavorite(d.id)}
                      className={`p-1 rounded transition-colors ${d.favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-surface-400 hover:text-yellow-500'}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={d.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </button>
                    <button onClick={() => handleExportImage(d.id)}
                      className="p-1 rounded text-surface-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    </button>
                    <button onClick={() => handleMoveUp(i)} disabled={i === 0}
                      className="p-1 rounded text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                    </button>
                    <button onClick={() => handleMoveDown(i)} disabled={i === visible.length - 1}
                      className="p-1 rounded text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    <button onClick={() => setEditDesign(d)}
                      className="p-1 rounded text-surface-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleTogglePaid(d.id)}
                      title={d.paid ? 'Cobrado ✓' : 'Marcar como cobrado'}
                      className={`p-1 rounded transition-colors ${d.paid ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'text-surface-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button onClick={() => handleDelete(d.id)}
                      className="p-1 rounded text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-surface-400">
                    {new Date(d.design_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                  {d.price > 0 && (
                    <p className={`text-[10px] font-semibold truncate max-w-[80px] ${d.paid ? 'text-emerald-500' : 'text-amber-500'}`}>
                      ${d.price.toFixed(2)}{d.paid ? ' ✓' : ' •'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Add design card */}
          {!compactView && (
            <button onClick={() => setShowUploader(true)}
              className="rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all duration-200"
              style={{border:'1.5px dashed rgba(80,70,181,0.2)',background:'rgba(80,70,181,0.03)'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(80,70,181,0.07)';(e.currentTarget as HTMLElement).style.borderColor='rgba(80,70,181,0.35)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(80,70,181,0.03)';(e.currentTarget as HTMLElement).style.borderColor='rgba(80,70,181,0.2)'}}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background:'rgba(80,70,181,0.1)'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(80,70,181)" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <span className="text-sm font-medium" style={{color:'rgba(80,70,181,0.65)'}}>Agregar diseño</span>
            </button>
          )}
        </div>
      )}

      {previewIndex !== null && (
        <FullScreenPreview images={visible} index={previewIndex} onClose={() => setPreviewIndex(null)} />
      )}
      {editDesign && (
        <DesignEditDialog design={editDesign} onSave={handleEditSave} onClose={() => { setEditDesign(null); loadData() }} />
      )}
      {showTemplates && (
        <TemplatesPanel
          onSelect={(t) => {
            setShowTemplates(false)
            setShowUploader(true)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {showUploader && <UnifiedUploadDialog clientId={id!} month={month} year={year} onUpload={handleUnifiedUpload} onClose={() => { setShowUploader(false); loadData() }} />}
      {showUrlImport && <UrlImportDialog clientId={id!} month={month} year={year} onImport={handleUrlImport} onClose={() => setShowUrlImport(false)} />}
      {showPresentation && visible.length > 0 && (
        <PresentationMode designs={visible} client={client} month={month} year={year} onClose={() => setShowPresentation(false)} />
      )}
      {showProforma && client && (
        <ProformaFlow
          clients={[client]}
          initialClient={client}
          designs={visible}
          month={month}
          year={year}
          onClose={() => setShowProforma(false)}
        />
      )}
      {showReport && (
        <ReportDialog
          client={client} month={month} year={year} designCount={visible.length}
          onGenerate={handleGenerate} generating={generating}
          onExportZip={handleExportZip} onExportGallery={handleExportGallery} zipping={zipping}
          onClose={() => setShowReport(false)}
        />
      )}
      {showManage === 'categories' && (
        <ManageListDialog title="Gestionar categorías" items={categories} defaults={DEFAULT_CATEGORIES}
          onAdd={saveCustomCategory} onDelete={deleteCustomCategory}
          onClose={() => { setShowManage(null); loadCategories().then(setCategories) }} />
      )}
      {showManage === 'platforms' && (
        <ManageListDialog title="Gestionar plataformas" items={platforms} defaults={DEFAULT_PLATFORMS}
          onAdd={saveCustomPlatform} onDelete={deleteCustomPlatform}
          onClose={() => { setShowManage(null); loadPlatforms().then(setPlatforms) }} />
      )}
    </div>
  )
}
