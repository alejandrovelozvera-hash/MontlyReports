import { useState, useEffect } from 'react'

const DEFAULT_COLORS = [
  '#5046B5', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#64748b', '#78716c', '#000000',
]

interface Props {
  value: string
  onChange: (color: string) => void
  label?: string
}

export default function ColorPalette({ value, onChange, label }: Props) {
  const [palettes, setPalettes] = useState<string[][]>([])
  const [newName, setNewName] = useState('')

  useEffect(() => {
    loadPalettes()
  }, [])

  async function loadPalettes() {
    const raw = await window.electronAPI.getSetting('color_palettes')
    if (raw) {
      try { setPalettes(JSON.parse(raw)) } catch {}
    }
  }

  async function saveCurrentToPalette() {
    const name = newName.trim()
    if (!name || palettes.some(p => p[0] === name)) return
    const updated = [...palettes, [name, value]]
    await window.electronAPI.setSetting('color_palettes', JSON.stringify(updated))
    setPalettes(updated)
    setNewName('')
  }

  async function removePalette(idx: number) {
    const updated = palettes.filter((_, i) => i !== idx)
    await window.electronAPI.setSetting('color_palettes', JSON.stringify(updated))
    setPalettes(updated)
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {/* Default presets */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {DEFAULT_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-lg transition-all ${value === c ? 'ring-2 ring-offset-1 ring-surface-400 dark:ring-offset-surface-900 scale-110' : 'hover:scale-105'}`}
            style={{ backgroundColor: c, border: c === '#000000' ? '1px solid #444' : 'none' }} />
        ))}
      </div>

      {/* Saved palettes */}
      {palettes.length > 0 && (
        <div className="mb-2">
          {palettes.map(([name, color], idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <button type="button" onClick={() => onChange(color)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors flex-1 text-left">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-surface-600 dark:text-surface-400">{name}</span>
              </button>
              <button type="button" onClick={() => removePalette(idx)}
                className="text-red-400 hover:text-red-600 p-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Picker + HEX + Save */}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent shrink-0" />
        <input type="text" value={value} onChange={(e) => {
          const v = e.target.value
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
        }} className="input text-xs font-mono w-20" placeholder="#HEX" maxLength={7} />
        <div className="w-5 h-5 rounded shrink-0" style={{ backgroundColor: value, border: '1px solid #e5e5e5' }} />
        <div className="flex gap-1 ml-auto">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombrar..." className="input text-xs w-20" maxLength={20} />
          <button type="button" onClick={saveCurrentToPalette} disabled={!newName.trim()}
            className="btn-primary text-xs px-2 py-1">Guardar</button>
        </div>
      </div>
    </div>
  )
}
