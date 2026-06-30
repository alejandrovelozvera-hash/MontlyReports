import { useState, useEffect } from 'react'
import { loadCategories, saveCustomCategory, deleteCustomCategory, DEFAULT_CATEGORIES } from '../utils/categories'
import { loadPlatforms, saveCustomPlatform, deleteCustomPlatform, DEFAULT_PLATFORMS } from '../utils/platforms'
import PromptDialog from './PromptDialog'
import ManageListDialog from './ManageListDialog'

interface Props {
  design: Design
  onSave: (designId: string, data: { title: string; description: string; category: string; notes: string; price: number; platform: string; platform_cost: number; design_date: string }) => Promise<void>
  onClose: () => void
}

export default function DesignEditDialog({ design, onSave, onClose }: Props) {
  const [categories, setCategories] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [title, setTitle] = useState(design.title)
  const [description, setDescription] = useState(design.description || '')
  const [category, setCategory] = useState(design.category || '')
  const [platform, setPlatform] = useState(design.platform || '')
  const [platformCost, setPlatformCost] = useState(String(design.platform_cost || ''))
  const [notes, setNotes] = useState(design.notes || '')
  const [price, setPrice] = useState(String(design.price || ''))
  const [date, setDate] = useState(() => {
    const d = new Date(design.design_date)
    return d.toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showPromptPlatform, setShowPromptPlatform] = useState(false)
  const [showManage, setShowManage] = useState<'categories' | 'platforms' | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [newImagePath, setNewImagePath] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)

  useEffect(() => { loadCategories().then(setCategories) }, [])
  useEffect(() => { loadPlatforms().then(setPlatforms) }, [])

  useEffect(() => {
    window.electronAPI.getTags(design.id).then(setTags)
  }, [design.id])

  async function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (!t || tags.includes(t)) return
    const newTags = [...tags, t]
    setTags(newTags)
    await window.electronAPI.setTags(design.id, newTags)
    setTagInput('')
  }

  async function removeTag(tag: string) {
    const newTags = tags.filter(t => t !== tag)
    setTags(newTags)
    await window.electronAPI.setTags(design.id, newTags)
  }

  async function handleAddCategory(name: string) {
    await saveCustomCategory(name)
    setCategories(await loadCategories())
    setCategory(name)
    setShowPrompt(false)
  }

  async function handleAddPlatform(name: string) {
    await saveCustomPlatform(name)
    setPlatforms(await loadPlatforms())
    setPlatform(name)
    setShowPromptPlatform(false)
  }

  const handleSelectImage = async () => {
    const filePath = await window.electronAPI.selectImage()
    if (filePath) setNewImagePath(filePath)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      if (newImagePath) {
        setReplacing(true)
        await window.electronAPI.replaceDesignImage(design.id, newImagePath)
        setReplacing(false)
      }
      await onSave(design.id, { title: title.trim(), description: description.trim(), category, notes: notes.trim(), price: price ? parseFloat(price) : 0, platform, platform_cost: platformCost ? parseFloat(platformCost) : 0, design_date: date })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Editar diseño</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800 shrink-0 relative">
              <img src={window.electronAPI.getImageUrl(newImagePath || design.thumbnail_path || design.file_path)} alt="" className="w-full h-full object-contain bg-surface-100" />
              {replacing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{design.file_name}</p>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={handleSelectImage} className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors">
                  Cambiar imagen
                </button>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="text-xs text-surface-400 bg-transparent border border-surface-200 dark:border-surface-700 rounded px-2 py-0.5 cursor-pointer hover:border-indigo-400 transition-colors" />
              </div>
              {newImagePath && <p className="text-[10px] text-emerald-500 mt-1 truncate">Nueva imagen seleccionada</p>}
            </div>
          </div>
          <div>
            <label className="label">Título *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" autoFocus required />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select value={category} onChange={(e) => {
                if (e.target.value === '__add__') { setShowPrompt(true); return }
                if (e.target.value === '__manage__') { setShowManage('categories'); return }
                setCategory(e.target.value)
              }} className="input">
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__add__" className="text-indigo-500 font-medium">+ Añadir categoría…</option>
              <option value="__manage__" className="text-indigo-500 font-medium">⚙ Gestionar categorías</option>
            </select>
            {showPrompt && <PromptDialog title="Nueva categoría" placeholder="Nombre de la categoría" onConfirm={handleAddCategory} onCancel={() => setShowPrompt(false)} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plataforma</label>
              <select value={platform} onChange={(e) => {
                  if (e.target.value === '__add__') { setShowPromptPlatform(true); return }
                  if (e.target.value === '__manage__') { setShowManage('platforms'); return }
                  setPlatform(e.target.value)
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
              <input type="number" value={platformCost} onChange={(e) => setPlatformCost(e.target.value)} className="input" placeholder="0" min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[60px] resize-none" />
          </div>
          <div>
            <label className="label">Precio ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="0.00" min="0" step="0.01" />
          </div>
          <div>
            <label className="label">Notas internas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[60px] resize-none text-xs text-surface-400" placeholder="Notas solo visibles aquí, no en el PDF..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={!title.trim() || saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
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
