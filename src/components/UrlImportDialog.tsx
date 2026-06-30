import { useState } from 'react'

const CATEGORIES = ['', 'Logo', 'Web', 'Redes', 'Packaging', 'Branding', 'Otro']

interface Props {
  clientId: string
  month: number
  year: number
  onImport: (data: { clientId: string; title: string; description: string; category: string; filePath: string; fileName: string; designDate: string }) => Promise<void>
  onClose: () => void
}

export default function UrlImportDialog({ clientId, month, year, onImport, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [downloadPath, setDownloadPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const designDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

  const handleDownload = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      const path = await window.electronAPI.downloadImageFromUrl(url.trim())
      setDownloadPath(path)
      if (!title) {
        const name = url.split('/').pop()?.split('?')[0] || 'image'
        setTitle(name.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''))
      }
    } catch (e: any) {
      setError(e.message || 'Error al descargar la imagen')
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!downloadPath || !title.trim()) return
    setSaving(true)
    try {
      const fileName = url.split('/').pop()?.split('?')[0] || `url_${Date.now()}.jpg`
      await onImport({
        clientId, title: title.trim(), description: description.trim(),
        category, filePath: downloadPath, fileName, designDate,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Importar desde URL</h3>
          <p className="text-sm text-surface-500 mt-1">Pega el enlace de una imagen pública</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">URL de la imagen</label>
            <div className="flex gap-2">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="input flex-1" placeholder="https://ejemplo.com/imagen.jpg" />
              <button type="button" onClick={handleDownload} disabled={!url.trim() || loading} className="btn-secondary shrink-0">
                {loading ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : 'Descargar'}
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {downloadPath && (
            <>
              <div className="rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                <img src={window.electronAPI.getImageUrl(downloadPath)} alt="" className="w-full h-40 object-contain" />
              </div>
              <div>
                <label className="label">Título *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
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
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[60px] resize-none" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            {downloadPath && (
              <button type="submit" disabled={!title.trim() || saving} className="btn-primary">
                {saving ? 'Importando...' : 'Importar diseño'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
