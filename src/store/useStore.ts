import { create } from 'zustand'

interface AppState {
  clients: Client[]
  loading: boolean
  error: string | null
  _loaded: boolean

  loadClients: (force?: boolean) => Promise<void>
  createClient: (data: CreateClientInput) => Promise<Client>
  updateClient: (id: string, data: Partial<CreateClientInput>) => Promise<void>
  deleteClient: (id: string) => Promise<void>

  createDesign: (data: CreateDesignInput) => Promise<void>
  deleteDesign: (id: string) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  clients: [],
  loading: false,
  error: null,
  _loaded: false,

  // Fix 3: evitar llamadas redundantes si ya están cargados
  loadClients: async (force = false) => {
    if (get()._loaded && !force) return
    set({ loading: true, error: null })
    try {
      const clients = await window.electronAPI.getClients()
      set({ clients, loading: false, _loaded: true })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  createClient: async (data) => {
    const client = await window.electronAPI.createClient(data)
    set((state) => ({ clients: [client, ...state.clients] }))
    return client
  },

  updateClient: async (id, data) => {
    const client = await window.electronAPI.updateClient(id, data)
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? client : c)),
    }))
  },

  deleteClient: async (id) => {
    await window.electronAPI.deleteClient(id)
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id),
    }))
  },

  createDesign: async (data) => {
    await window.electronAPI.createDesign(data)
  },

  deleteDesign: async (id) => {
    await window.electronAPI.deleteDesign(id)
  },
}))
