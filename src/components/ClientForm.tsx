import { useState } from 'react'
import { useStore } from '../store/useStore'
import ColorPalette from './ColorPalette'

interface Props {
  client?: Client
  onClose: () => void
}

export default function ClientForm({ client, onClose }: Props) {
  const { createClient, updateClient } = useStore()
  const [name, setName] = useState(client?.name || '')
  const [company, setCompany] = useState(client?.company || '')
  const [email, setEmail] = useState(client?.email || '')
  const [color, setColor] = useState(client?.color || '#6366f1')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleLogoSelect = async () => {
    const path = await window.electronAPI.selectImage()
    if (path) {
      await window.electronAPI.setClientLogo(client?.id || '', path)
      setLogoUrl(window.electronAPI.getImageUrl(path))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (client) {
        await updateClient(client.id, { name: name.trim(), company: company.trim(), email: email.trim(), color })
      } else {
        await createClient({ name: name.trim(), company: company.trim(), email: email.trim(), color })
      }
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {client ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Logo */}
          <div>
            <label className="label">Logo (opcional)</label>
            <button type="button" onClick={handleLogoSelect}
              className="w-full h-24 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl flex flex-col items-center justify-center gap-1 text-surface-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              <span className="text-xs">{logoUrl || client?.logo_path ? 'Cambiar logo' : 'Seleccionar imagen'}</span>
            </button>
          </div>

          <div>
            <label className="label">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej: María García" autoFocus required />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="input" placeholder="Ej: Agencia Creativa" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="cliente@ejemplo.com" />
          </div>

          <ColorPalette value={color} onChange={setColor} label="Color" />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={!name.trim() || saving} className="btn-primary">
              {saving ? 'Guardando...' : client ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
