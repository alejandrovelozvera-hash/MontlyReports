import { useState } from 'react'
import { getMonthName } from '../utils/date'
import ColorPalette from './ColorPalette'

const TEMPLATES = [
  { value: 'classic' as const, label: 'Clásico', desc: 'Fondo oscuro con acentos de color' },
  { value: 'minimal' as const, label: 'Minimal', desc: 'Blanco con barra lateral de color' },
  { value: 'modern' as const, label: 'Moderno', desc: 'Tipografía grande, fondos planos' },
]

interface Props {
  client: Client
  month: number
  year: number
  designCount: number
  onGenerate: (message: string, color: string, template: 'classic' | 'minimal' | 'modern', watermark: string) => Promise<void>
  onExportZip: () => Promise<void>
  onExportGallery: () => Promise<void>
  generating: boolean
  zipping: boolean
  onClose: () => void
}

export default function ReportDialog({
  client, month, year, designCount, onGenerate, onExportZip, onExportGallery,
  generating, zipping, onClose,
}: Props) {
  const monthName = getMonthName(month)

  const [personalMessage, setPersonalMessage] = useState('')
  const [templateColor, setTemplateColor] = useState('#6366f1')
  const [templateStyle, setTemplateStyle] = useState<'classic' | 'minimal' | 'modern'>('classic')
  const [watermark, setWatermark] = useState('')

  const handleGenerate = () => onGenerate(personalMessage, templateColor, templateStyle, watermark)

  const handleMailto = () => {
    const subject = `Informe de Diseños — ${monthName} ${year}`
    const body = `Hola ${client.name},\n\nAdjunto el informe de diseños de ${monthName} ${year}.\n\nSaludos,`
    window.electronAPI.openMailto(client.email, subject, body)
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Informe mensual</h3>
          <p className="text-sm text-surface-500 mt-1">{monthName} {year} — {client.name}</p>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-600 dark:text-indigo-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{designCount} diseño{designCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-surface-500">Listo para generar</p>
            </div>
          </div>

          <div>
            <label className="label">Mensaje personal (opcional)</label>
            <textarea value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)} className="input min-h-[60px] resize-none" placeholder="Escribe una nota para incluir al inicio del PDF..." />
          </div>

          <div>
            <label className="label">Plantilla</label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.value} type="button" onClick={() => setTemplateStyle(t.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    templateStyle === t.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                  }`}>
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">{t.label}</p>
                  <p className="text-[10px] text-surface-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <ColorPalette value={templateColor} onChange={setTemplateColor} label="Color del informe" />

          <div>
            <label className="label">Marca de agua (opcional)</label>
            <input type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)} className="input" placeholder="Ej: CONFIDENCIAL, BORRADOR, etc." />
          </div>

          <button onClick={handleGenerate} disabled={generating || designCount === 0} className="btn-primary w-full">
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> Generar PDF</>
            )}
          </button>

          <button onClick={onExportZip} disabled={zipping} className="btn-secondary w-full">
              {zipping ? (
                <><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Comprimiendo...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg> Exportar ZIP</>
              )}
            </button>

          <button onClick={onExportGallery} className="btn-secondary w-full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            Generar galería HTML
          </button>

          {client.email && (
            <button onClick={handleMailto} className="btn-ghost w-full text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              Enviar por correo a {client.email}
            </button>
          )}


        </div>

        <div className="p-4 border-t border-surface-200 dark:border-surface-800 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
