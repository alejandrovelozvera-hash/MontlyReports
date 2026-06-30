import { useState, useEffect } from 'react'

interface Props { clientId: string }

export default function ClientNotes({ clientId }: Props) {
  const [notes, setNotes] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [clientId])

  async function load() {
    setLoading(true)
    const n = await window.electronAPI.listClientNotes(clientId)
    setNotes(n); setLoading(false)
  }

  async function add() {
    if (!input.trim()) return
    await window.electronAPI.addClientNote(clientId, input.trim())
    setInput(''); load()
  }

  async function del(id: string) {
    await window.electronAPI.deleteClientNote(id); load()
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4" style={{color:'rgb(var(--text-primary))'}}>
        📝 Notas del cliente
      </h3>
      <div className="flex gap-2 mb-4">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Agregar nota..." className="input text-sm flex-1" />
        <button onClick={add} className="btn-primary text-sm px-3">Agregar</button>
      </div>
      {loading ? (
        <div className="h-12 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'rgba(80,70,181,0.3)',borderTopColor:'rgb(80,70,181)'}}/>
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-center py-4" style={{color:'rgb(var(--text-secondary))'}}>Sin notas aún</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="flex gap-2 items-start p-3 rounded-xl group"
              style={{background:'rgba(255,255,255,0.3)'}}>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{color:'rgb(var(--text-primary))'}}>{n.note}</p>
                <p className="text-[10px] mt-1" style={{color:'rgb(var(--text-secondary))'}}>
                  {new Date(n.created_at).toLocaleDateString('es-ES', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                </p>
              </div>
              <button onClick={() => del(n.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 rounded">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
