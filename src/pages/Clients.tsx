import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import ClientForm from '../components/ClientForm'
import ProformaFlow from '../components/ProformaFlow'

export default function Clients() {
  const { clients, loadClients, loading } = useStore()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [proformaClient, setProformaClient] = useState<Client | null>(null)

  useEffect(() => { loadClients() }, [])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company||'').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" style={{color:'rgb(var(--text-primary))'}}>Clientes</h2>
          <p className="text-sm mt-1" style={{color:'rgb(var(--text-secondary))'}}>
            {clients.length} cliente{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
          className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'rgb(var(--text-secondary))'}}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar clientes..." className="input pl-9" />
      </div>

      {loading && clients.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'rgba(80,70,181,0.3)',borderTopColor:'rgb(80,70,181)'}}/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{background:'rgba(80,70,181,0.1)'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(80,70,181)" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{color:'rgb(var(--text-primary))'}}>
            {search ? 'Sin resultados' : 'No hay clientes'}
          </p>
          <p className="text-xs mb-4" style={{color:'rgb(var(--text-secondary))'}}>
            {search ? 'Prueba con otro nombre' : 'Agrega un cliente para empezar'}
          </p>
          {!search && <button onClick={() => setShowForm(true)} className="btn-primary">Agregar cliente</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="glass-card overflow-hidden hover:shadow-lg transition-all duration-200 group">
              <button onClick={() => navigate(`/clients/${client.id}`)} className="w-full p-5 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-semibold text-base shrink-0 shadow-sm"
                    style={{background:`linear-gradient(145deg, ${client.color}, ${client.color}cc)`}}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{color:'rgb(var(--text-primary))'}}>{client.name}</p>
                    {client.company && <p className="text-xs truncate mt-0.5" style={{color:'rgb(var(--text-secondary))'}}>{client.company}</p>}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{color:'rgb(80,70,181)'}}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                {client.email && (
                  <p className="text-xs truncate" style={{color:'rgb(var(--text-secondary))'}}>{client.email}</p>
                )}
              </button>
              <div style={{borderTop:'0.5px solid var(--glass-border)',display:'flex'}}>
                <button onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex-1 py-2.5 text-xs font-medium transition-colors"
                  style={{color:'rgb(80,70,181)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(80,70,181,0.08)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  Ver diseños
                </button>
                <button onClick={() => { setEditClient(client); setShowForm(true) }}
                  className="flex-1 py-2.5 text-xs font-medium transition-colors"
                  style={{color:'rgb(var(--text-secondary))',borderLeft:'0.5px solid var(--glass-border)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  Editar
                </button>
                <button onClick={() => navigate(`/clients/${client.id}?report=1`)}
                  className="flex-1 py-2.5 text-xs font-medium transition-colors"
                  style={{color:'rgb(29,158,117)',borderLeft:'0.5px solid var(--glass-border)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(29,158,117,0.08)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  Informe
                </button>
                <button onClick={() => setProformaClient(client)}
                  className="flex-1 py-2.5 text-xs font-medium transition-colors"
                  style={{color:'rgb(80,70,181)',borderLeft:'0.5px solid var(--glass-border)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(80,70,181,0.08)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  Proforma
                </button>
              </div>
            </div>
          ))}
          {/* Add new client card */}
          <button onClick={() => setShowForm(true)}
            className="min-h-[120px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200"
            style={{border:'1.5px dashed rgba(80,70,181,0.25)',background:'rgba(80,70,181,0.04)'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(80,70,181,0.08)';e.currentTarget.style.borderColor='rgba(80,70,181,0.4)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(80,70,181,0.04)';e.currentTarget.style.borderColor='rgba(80,70,181,0.25)'}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(80,70,181,0.12)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(80,70,181)" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <span className="text-sm font-medium" style={{color:'rgba(80,70,181,0.7)'}}>Nuevo cliente</span>
          </button>
        </div>
      )}

      {showForm && !editClient && <ClientForm onClose={() => setShowForm(false)} />}
      {showForm && editClient && <ClientForm client={editClient} onClose={() => { setShowForm(false); setEditClient(null); loadClients() }} />}
      {proformaClient && (
        <ProformaFlow
          clients={clients}
          initialClient={proformaClient}
          onClose={() => setProformaClient(null)}
        />
      )}
    </div>
  )
}
