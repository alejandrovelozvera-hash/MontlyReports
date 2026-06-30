import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { formatDateShort } from '../utils/date'
import { loadCategories, saveCustomCategory, deleteCustomCategory, DEFAULT_CATEGORIES } from '../utils/categories'
import { loadPlatforms, saveCustomPlatform, deleteCustomPlatform, DEFAULT_PLATFORMS } from '../utils/platforms'
import PromptDialog from './PromptDialog'
import ManageListDialog from './ManageListDialog'

interface FileItem {
  path: string
  name: string
  title: string
  category: string
}

interface Props {
  clientId: string
  clientName: string
  month: number
  year: number
  onClose: () => void
}

export default function BatchUploader({ clientId, clientName, month, year, onClose }: Props) {
  const { createDesign } = useStore()
  const [categories, setCategories] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [commonCategory, setCommonCategory] = useState('')
  const [commonPlatform, setCommonPlatform] = useState('')
  const [commonPlatformCost, setCommonPlatformCost] = useState('')
  const [designDate, setDesignDate] = useState(
    `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  )
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [showPrompt, setShowPrompt] = useState(false)
  const [showPromptPlatform, setShowPromptPlatform] = useState(false)
  const [showManage, setShowManage] = useState<'categories' | 'platforms' | null>(null)

  useEffect(() => { loadCategories().then(setCategories) }, [])
  useEffect(() => { loadPlatforms().then(setPlatforms) }, [])

  const handleSelectFiles = async () => {
    const paths = await window.electronAPI.selectImages()
    if (paths.length === 0) return
    const newFiles: FileItem[] = paths.map((p) => {
      const n = p.split('\\').pop()?.split('/').pop() || ''
      return { path: p, name: n, title: n.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '), category: commonCategory }
    })
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const updateTitle = (i: number, t: string) => setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, title: t } : f))

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

  const handleUploadAll = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress({ current: 0, total: files.length })
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      try {
        await createDesign({
          clientId, title: f.title.trim() || f.name, category: f.category || commonCategory,
          filePath: f.path, fileName: f.name, designDate,
          platform: commonPlatform,
          platform_cost: commonPlatformCost ? parseFloat(commonPlatformCost) : 0,
        })
      } catch (err) { console.error(`Error uploading ${f.name}:`, err) }
      setProgress({ current: i + 1, total: files.length })
    }
    onClose()
  }

  const today = new Date()
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Subir en lote</h3>
          <p className="text-sm text-surface-500 mt-1">
            {clientName} — {formatDateShort(`${year}-${String(month).padStart(2, '0')}-01`)}
          </p>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {files.length === 0 ? (
            <button type="button" onClick={handleSelectFiles}
              className="w-full h-40 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl flex flex-col items-center justify-center gap-2 text-surface-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span className="text-sm font-medium">Seleccionar múltiples imágenes</span>
              <span className="text-xs">Ctrl+Click para seleccionar varias</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">{files.length} archivo{files.length !== 1 ? 's' : ''}</p>
                <button onClick={handleSelectFiles} className="btn-ghost text-xs">Agregar más</button>
              </div>
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
                    <div className="w-10 h-10 rounded-lg bg-surface-200 dark:bg-surface-700 shrink-0 flex items-center justify-center overflow-hidden">
                      <img src={window.electronAPI.getImageUrl(file.path)} alt="" className="w-full h-full object-contain bg-surface-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input type="text" value={file.title} onChange={(e) => updateTitle(i, e.target.value)}
                        className="w-full text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-surface-300 focus:border-indigo-500 focus:outline-none px-0 py-0.5 text-surface-900 dark:text-surface-100" />
                      <p className="text-xs text-surface-400 mt-0.5 truncate">{file.name}</p>
                    </div>
                    <button onClick={() => removeFile(i)}
                      className="p-1 rounded text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Categoría común</label>
              <select value={commonCategory} onChange={(e) => {
                  if (e.target.value === '__add__') { setShowPrompt(true); return }
                  if (e.target.value === '__manage__') { setShowManage('categories'); return }
                  setCommonCategory(e.target.value)
                }} className="input">
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__add__" className="text-indigo-500 font-medium">+ Añadir categoría…</option>
                <option value="__manage__" className="text-indigo-500 font-medium">⚙ Gestionar categorías</option>
              </select>
              {showPrompt && <PromptDialog title="Nueva categoría" placeholder="Nombre de la categoría" onConfirm={handleAddCategory} onCancel={() => setShowPrompt(false)} />}
            </div>
            <div>
              <label className="label">Plataforma</label>
              <select value={commonPlatform} onChange={(e) => {
                  if (e.target.value === '__add__') { setShowPromptPlatform(true); return }
                  if (e.target.value === '__manage__') { setShowManage('platforms'); return }
                  setCommonPlatform(e.target.value)
                }} className="input">
                <option value="">Sin plataforma</option>
                {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
                <option value="__add__" className="text-indigo-500 font-medium">+ Añadir plataforma…</option>
                <option value="__manage__" className="text-indigo-500 font-medium">⚙ Gestionar plataformas</option>
              </select>
              {showPromptPlatform && <PromptDialog title="Nueva plataforma" placeholder="Nombre de la plataforma" onConfirm={handleAddPlatform} onCancel={() => setShowPromptPlatform(false)} />}
            </div>
            <div>
              <label className="label">Costo de pauta ($)</label>
              <input type="number" value={commonPlatformCost} onChange={(e) => setCommonPlatformCost(e.target.value)} className="input" placeholder="0" min="0" step="0.01" />
            </div>
            <div>
              <label className="label">Fecha común</label>
              <input type="date" value={designDate} onChange={(e) => setDesignDate(e.target.value)}
                min={`${year}-01-01`} max={maxDate} className="input" />
            </div>
          </div>

          {uploading && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-indigo-700 dark:text-indigo-300">Subiendo {progress.current} de {progress.total}...</span>
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
