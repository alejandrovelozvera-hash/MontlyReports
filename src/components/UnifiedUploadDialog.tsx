import { useState, useEffect, useRef } from 'react'
import { loadCategories, saveCustomCategory, deleteCustomCategory, DEFAULT_CATEGORIES } from '../utils/categories'
import { loadPlatforms, saveCustomPlatform, deleteCustomPlatform, DEFAULT_PLATFORMS } from '../utils/platforms'
import PromptDialog from './PromptDialog'
import ManageListDialog from './ManageListDialog'

interface FileItem {
  path: string
  name: string
}

interface Props {
  clientId: string
  month: number
  year: number
  onUpload: (files: { path: string; name: string; title: string; category: string; price: number; platform: string; platform_cost: number }[]) => Promise<void>
  onClose: () => void
}

export default function UnifiedUploadDialog({ clientId, month, year, onUpload, onClose }: Props) {
  const [categories, setCategories] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [commonCategory, setCommonCategory] = useState('')
  const [commonPlatform, setCommonPlatform] = useState('')
  const [commonPlatformCost, setCommonPlatformCost] = useState('')
  const [commonPrice, setCommonPrice] = useState('')
  const [designDate, setDesignDate] = useState(
    `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  )
  const [titles, setTitles] = useState<Record<number, string>>({})
  const [prices, setPrices] = useState<Record<number, string>>({})
  const [platformsPerFile, setPlatformsPerFile] = useState<Record<number, string>>({})
  const [platformCostsPerFile, setPlatformCostsPerFile] = useState<Record<number, string>>({})
  const [uploading, setUploading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showPromptPlatform, setShowPromptPlatform] = useState(false)
  const [showManage, setShowManage] = useState<'categories' | 'platforms' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadCategories().then(setCategories) }, [])
  useEffect(() => { loadPlatforms().then(setPlatforms) }, [])

  const handleSelectFiles = async () => {
    const paths = await window.electronAPI.selectImages()
    if (paths.length === 0) return
    const newFiles: FileItem[] = paths.map((p: string) => {
      const n = p.split('\\').pop()?.split('/').pop() || ''
      return { path: p, name: n }
    })
    const offset = files.length
    setFiles((prev) => [...prev, ...newFiles])
    // Auto-generate titles for new files
    setTitles((prev) => {
      const next = { ...prev }
      newFiles.forEach((f, i) => {
        next[offset + i] = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      })
      return next
    })
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setTitles((prev) => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
    setPrices((prev) => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
    setPlatformsPerFile((prev) => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
    setPlatformCostsPerFile((prev) => {
      const next = { ...prev }
      delete next[idx]
      return next
    })
  }

  const handleUploadAll = async () => {
    if (files.length === 0) return
    setUploading(true)
    try {
      const items = files.map((f, i) => {
        const t = titles[i]?.trim() || f.name.replace(/\.[^/.]+$/, '')
        const p = prices[i]?.trim() || commonPrice
        const pf = platformsPerFile[i] || commonPlatform
        const pc = platformCostsPerFile[i]?.trim() || commonPlatformCost
        return {
          path: f.path, name: f.name, title: t,
          category: commonCategory,
          price: p ? parseFloat(p) : 0,
          platform: pf,
          platform_cost: pc ? parseFloat(pc) : 0,
        }
      })
      await onUpload(items)
      onClose()
    } finally { setUploading(false) }
  }

  async function handleAddCategory(name: string) {
    await saveCustomCategory(name)
    setCategories(await loadCategories())
    setCommonCategory(name)
    setShowPrompt(false)
  }

  async function handleAddPlatform(name: string) {
    await saveCustomPlatform(name)
    setPlatforms(await loadPlatforms())
    setCommonPlatform(name)
    setShowPromptPlatform(false)
  }

  const today = new Date()
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Subir diseños</h3>
          <p className="text-sm text-surface-500 mt-1">{files.length} archivo{files.length !== 1 ? 's' : ''} seleccionado{files.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="p-6 space-y-5 max-h-[55vh] overflow-y-auto">
          {/* File selector */}
          <button type="button" onClick={handleSelectFiles}
            className="w-full h-20 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl flex flex-col items-center justify-center gap-1 text-surface-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            <span className="text-sm font-medium">Seleccionar imágenes</span>
          </button>

          {/* Common defaults */}
          <div className="rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700 p-4 space-y-3">
            <p className="text-xs font-semibold tracking-wider text-surface-400 uppercase">Valores por defecto</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="label">Categoría</label>
                <select value={commonCategory} onChange={(e) => {
                    if (e.target.value === '__add__') { setShowPrompt(true); return }
                    if (e.target.value === '__manage__') { setShowManage('categories'); return }
                    setCommonCategory(e.target.value)
                  }} className="input">
                  <option value="">Sin categoría</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__add__" className="text-indigo-500 font-medium">+ Nueva…</option>
                  <option value="__manage__" className="text-indigo-500 font-medium">⚙ Gestionar</option>
                </select>
                {showPrompt && <PromptDialog title="Nueva categoría" placeholder="Nombre de la categoría" onConfirm={handleAddCategory} onCancel={() => setShowPrompt(false)} />}
              </div>
              <div>
                <label className="label">Plataforma / Red social</label>
                <select value={commonPlatform} onChange={(e) => {
                    if (e.target.value === '__add__') { setShowPromptPlatform(true); return }
                    if (e.target.value === '__manage__') { setShowManage('platforms'); return }
                    setCommonPlatform(e.target.value)
                  }} className="input">
                  <option value="">Sin plataforma</option>
                  {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
                  <option value="__add__" className="text-indigo-500 font-medium">+ Nueva…</option>
                  <option value="__manage__" className="text-indigo-500 font-medium">⚙ Gestionar</option>
                </select>
                {showPromptPlatform && <PromptDialog title="Nueva plataforma" placeholder="Nombre de la plataforma" onConfirm={handleAddPlatform} onCancel={() => setShowPromptPlatform(false)} />}
              </div>
              <div>
                <label className="label">Precio del diseño ($)</label>
                <input type="number" value={commonPrice} onChange={(e) => setCommonPrice(e.target.value)} className="input" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="label">Costo de pauta ($)</label>
                <input type="number" value={commonPlatformCost} onChange={(e) => setCommonPlatformCost(e.target.value)} className="input" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="label">Fecha</label>
                <input type="date" value={designDate} onChange={(e) => setDesignDate(e.target.value)}
                  min={`${year}-01-01`} max={maxDate} className="input" />
              </div>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-surface-400 uppercase">{files.length} archivo{files.length !== 1 ? 's' : ''}</p>
              {files.map((file, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 shadow-sm">
                  <div className="w-14 h-14 rounded-lg bg-surface-100 dark:bg-surface-700 shrink-0 flex items-center justify-center overflow-hidden border border-surface-200 dark:border-surface-600">
                    <img src={window.electronAPI.getImageUrl(file.path)} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input type="text" value={titles[i] || ''} onChange={(e) => setTitles((p) => ({ ...p, [i]: e.target.value }))}
                      className="w-full text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-surface-300 focus:border-indigo-500 focus:outline-none px-0 py-0.5 text-surface-900 dark:text-surface-100" />
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-surface-400 font-medium whitespace-nowrap">Diseño</span>
                        <input type="number" value={prices[i] ?? ''} onChange={(e) => setPrices((p) => ({ ...p, [i]: e.target.value }))}
                          className="w-20 text-xs bg-transparent border border-surface-200 dark:border-surface-700 rounded-md px-2 py-1 text-surface-600 dark:text-surface-300"
                          placeholder={commonPrice || '$$'} min="0" step="0.01" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-surface-400 font-medium whitespace-nowrap">Pauta</span>
                        <select value={platformsPerFile[i] ?? ''} onChange={(e) => setPlatformsPerFile((p) => ({ ...p, [i]: e.target.value }))}
                          className="text-xs bg-transparent border border-surface-200 dark:border-surface-700 rounded-md px-2 py-1 text-surface-500 max-w-[110px]">
                          <option value="">{commonPlatform || 'Plataforma'}</option>
                          {platforms.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                        </select>
                        <input type="number" value={platformCostsPerFile[i] ?? ''} onChange={(e) => setPlatformCostsPerFile((p) => ({ ...p, [i]: e.target.value }))}
                          className="w-16 text-xs bg-transparent border border-surface-200 dark:border-surface-700 rounded-md px-2 py-1 text-surface-600 dark:text-surface-300"
                          placeholder={commonPlatformCost || '$'} min="0" step="0.01" />
                      </div>
                    </div>
                    <p className="text-[10px] text-surface-400 truncate">{file.name}</p>
                  </div>
                  <button onClick={() => removeFile(i)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0 self-start transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-indigo-700 dark:text-indigo-300">Subiendo {files.length} archivo{files.length !== 1 ? 's' : ''}...</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-surface-200 dark:border-surface-800 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary" disabled={uploading}>Cancelar</button>
          <button onClick={handleUploadAll} disabled={files.length === 0 || uploading} className="btn-primary">
            {uploading ? 'Subiendo...' : `Subir ${files.length > 0 ? `(${files.length})` : ''}`}
          </button>
        </div>
      </div>
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
