import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Clients
  getClients: () => ipcRenderer.invoke('clients:list'),
  createClient: (data: any) => ipcRenderer.invoke('clients:create', data),
  updateClient: (id: string, data: any) => ipcRenderer.invoke('clients:update', id, data),
  deleteClient: (id: string) => ipcRenderer.invoke('clients:delete', id),
  uploadLogo: (clientId: string, filePath: string) => ipcRenderer.invoke('clients:upload-logo', clientId, filePath),
  removeLogo: (clientId: string) => ipcRenderer.invoke('clients:remove-logo', clientId),
  setClientLogo: (clientId: string, filePath: string) => ipcRenderer.invoke('clients:upload-logo', clientId, filePath),

  // Designs
  getDesigns: (clientId: string, month?: number, year?: number) =>
    ipcRenderer.invoke('designs:list', clientId, month, year),
  getDesignsByMonth: (clientId: string, month: number, year: number) =>
    ipcRenderer.invoke('designs:list-by-month', clientId, month, year),
  createDesign: (data: any) => ipcRenderer.invoke('designs:create', data),
  toggleDesignPaid: (id: string) => ipcRenderer.invoke('designs:togglePaid', id),
  deleteDesign: (id: string) => ipcRenderer.invoke('designs:delete', id),
  replaceDesignImage: (id: string, filePath: string) => ipcRenderer.invoke('designs:replace-image', id, filePath),

  listTemplates: () => ipcRenderer.invoke('templates:list'),
  createTemplate: (data: any) => ipcRenderer.invoke('templates:create', data),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),

  getTags: (designId: string) => ipcRenderer.invoke('tags:get', designId),
  setTags: (designId: string, tags: string[]) => ipcRenderer.invoke('tags:set', designId, tags),
  getAllTags: () => ipcRenderer.invoke('tags:all'),

  listClientNotes: (clientId: string) => ipcRenderer.invoke('clientNotes:list', clientId),
  addClientNote: (clientId: string, note: string) => ipcRenderer.invoke('clientNotes:add', clientId, note),
  deleteClientNote: (id: string) => ipcRenderer.invoke('clientNotes:delete', id),

  getGoal: (month: number, year: number) => ipcRenderer.invoke('goals:get', month, year),
  setGoal: (month: number, year: number, goal: number) => ipcRenderer.invoke('goals:set', month, year, goal),

  setClientStatus: (id: string, status: string) => ipcRenderer.invoke('clients:setStatus', id, status),
  generateProforma: (data: any) => ipcRenderer.invoke('proforma:generate', data),
  notify: (title: string, body: string) => ipcRenderer.invoke('notify', title, body),
  winMinimize: () => ipcRenderer.send('win:minimize'),
  winMaximize: () => ipcRenderer.send('win:maximize'),
  winClose: () => ipcRenderer.send('win:close'),
  winIsMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  updateDesign: (id: string, data: any) => ipcRenderer.invoke('designs:update', id, data),
  batchReorder: (items: { id: string; sortOrder: number }[]) =>
    ipcRenderer.invoke('designs:batch-reorder', items),

  // Reports
  generateReport: (params: { clientId: string; month: number; year: number; message: string; color: string; template?: string; watermark?: string }) =>
    ipcRenderer.invoke('report:generate', params.clientId, params.month, params.year, params.message, params.color, params.template, params.watermark),
  getReports: (clientId: string) => ipcRenderer.invoke('reports:list', clientId),

  // Files
  selectImage: () => ipcRenderer.invoke('dialog:select-image'),
  selectImages: () => ipcRenderer.invoke('dialog:select-images'),
  selectSavePath: (defaultName: string) => ipcRenderer.invoke('dialog:select-save-path', defaultName),
  getImageUrl: (filePath: string) => {
    if (!filePath) { console.warn('[getImageUrl] empty path'); return '' }
    if (filePath.startsWith('http')) return filePath
    const result = ipcRenderer.sendSync('image:get-url-sync', filePath)
    if (result) return result
    console.warn('[getImageUrl] fallback to media:// for:', filePath)
    return `media:///${filePath.replace(/\\/g, '/')}`
  },
  readImageBase64: (filePath: string) => ipcRenderer.invoke('image:read-base64', filePath),

  // App
  getAppPath: () => ipcRenderer.invoke('app:get-path'),
  openFolder: (filePath: string) => ipcRenderer.invoke('shell:open-folder', filePath),
  openMailto: (to: string, subject: string, body: string) =>
    ipcRenderer.invoke('shell:open-mailto', to, subject, body),

  // Backup
  backupData: () => ipcRenderer.invoke('backup:create-dialog'),
  restoreData: () => ipcRenderer.invoke('backup:restore-dialog'),

  // Export
  exportClientZip: (clientId: string, month: number, year: number) =>
    ipcRenderer.invoke('export:client-zip', clientId, month, year),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  setCompanyLogo: (filePath: string) => ipcRenderer.invoke('settings:set-company-logo', filePath),

  // Proforma Template
  uploadProformaTemplate: () => ipcRenderer.invoke('proforma-template:upload'),
  getProformaTemplate: () => ipcRenderer.invoke('proforma-template:get'),
  removeProformaTemplate: () => ipcRenderer.invoke('proforma-template:remove'),

  // Products
  listProducts: () => ipcRenderer.invoke('products:list'),
  createProduct: (data: { name: string; category: string; price: number }) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id: string, data: { name?: string; category?: string; price?: number }) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id: string) => ipcRenderer.invoke('products:delete', id),

  // Packages
  listPackages: () => ipcRenderer.invoke('packages:list'),
  createPackage: (data: { name: string; description: string; items: { description: string; category: string; quantity: number; price: number }[] }) =>
    ipcRenderer.invoke('packages:create', data),
  updatePackage: (id: string, data: { name?: string; description?: string; items?: { description: string; category: string; quantity: number; price: number }[] }) =>
    ipcRenderer.invoke('packages:update', id, data),
  deletePackage: (id: string) => ipcRenderer.invoke('packages:delete', id),

  // URL Import
  downloadImageFromUrl: (url: string) => ipcRenderer.invoke('url:download-image', url),

  // Search
  searchDesigns: (query: string) => ipcRenderer.invoke('search:designs', query),

  // Export single image
  exportDesignImage: (designId: string) => ipcRenderer.invoke('designs:export-image', designId),

  // Favorites
  toggleFavorite: (designId: string) => ipcRenderer.invoke('designs:toggle-favorite', designId),

  // Gallery
  exportGalleryHtml: (clientId: string, month: number, year: number) =>
    ipcRenderer.invoke('export:gallery-html', clientId, month, year),

  // Selective export
  exportClientData: (clientId: string) => ipcRenderer.invoke('export:client-data', clientId),

  // Supabase migration
  runMigration: (url: string, anonKey: string) => ipcRenderer.invoke('migration:run', url, anonKey),
  saveMigrationConfig: (url: string, anonKey: string) => ipcRenderer.invoke('migration:save-config', url, anonKey),
  getMigrationConfig: () => ipcRenderer.invoke('migration:get-config'),
  setSupabaseMode: (enabled: boolean) => ipcRenderer.invoke('migration:set-mode', enabled),
  getSupabaseMode: () => ipcRenderer.invoke('migration:get-mode'),
  uploadPendingFiles: () => ipcRenderer.invoke('migration:upload-files'),

  // Events
  onExportProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('export:progress', (_event, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('export:progress')
  },
})
