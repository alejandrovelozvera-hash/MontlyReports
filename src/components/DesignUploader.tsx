import { useState } from 'react'
import { useStore } from '../store/useStore'
import { formatDateShort } from '../utils/date'

const CATEGORIES = ['', 'Logo', 'Web', 'Redes', 'Packaging', 'Branding', 'Otro']

interface Props {
  clientId: string
  month: number
  year: number
  onClose: () => void
}

export default function DesignUploader({ clientId, month, year, onClose }: Props) {
  const { createDesign } = useStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [designDate, setDesignDate] = useState(
    `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  )
  const [saving, setSaving] = useState(false)

  const handleSelectFile = async () => {
    const filePath = await window.electronAPI.selectImage()
    if (filePath) {
      setSelectedFile(filePath)
      const name = filePath.split('\\').pop()?.split('/').pop() || ''
      setFileName(name)
      setPreviewUrl(window.electronAPI.getImageUrl(filePath))
      if (!title) {
        setTitle(name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !title.trim()) return

    setSaving(true)
    try {
      await createDesign({
        clientId,
        title: title.trim(),
        description: description.trim(),
        category,
        filePath: selectedFile,
        fileName,
        designDate,
      })
      onClose()
    } catch (err: any) {
      alert(`Error al subir: ${err?.message || 'Desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const today = new Date()
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Subir diseño</h3>
          <p className="text-sm text-surface-500 mt-1">
            {formatDateShort(`${year}-${String(month).padStart(2, '0')}-01`)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50" />
              <button type="button" onClick={() => { setSelectedFile(null); setPreviewUrl(null) }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white hover:bg-red-500/80">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ) : (
            <button type="button" onClick={handleSelectFile}
              className="w-full h-32 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl flex flex-col items-center justify-center gap-2 text-surface-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span className="text-sm">Seleccionar imagen</span>
              <span className="text-xs">JPG, PNG, WebP</span>
            </button>
          )}

          <div>
            <label className="label">Título *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Ej: Landing page - Hero" autoFocus required />
          </div>

          <div>
            <label className="label">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">Sin categoría</option>
              {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder="Descripción opcional..." />
          </div>

          <div>
            <label className="label">Fecha del diseño</label>
            <input type="date" value={designDate} onChange={(e) => setDesignDate(e.target.value)} min={`${year}-01-01`} max={maxDate} className="input" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={!selectedFile || !title.trim() || saving} className="btn-primary">
              {saving ? 'Subiendo...' : 'Subir diseño'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
