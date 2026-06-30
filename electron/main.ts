import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { Jimp } from 'jimp'
import { getDb, queryAll, queryOne, execute, closeDb, saveDb } from './db'
import { generatePDF, generateProformaPDF } from './pdf-generator'
import { configureSupabase, runMigration, uploadPendingFiles } from './migrate-to-supabase'
import * as supabaseService from './supabase-service'

let archiver: any = null
async function getArchiver() {
  if (!archiver) archiver = (await import('archiver')).default
  return archiver
}

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

const MEDIA_PROTOCOL = 'media'

function getSplashPath(): string {
  const paths = [
    path.join(__dirname, 'splash.html'),
    path.join(__dirname, '../dist-electron/splash.html'),
    path.join(__dirname, '../electron/splash.html'),
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return paths[0]
}

function showSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    center: true,
    frame: false,
    resizable: false,
    transparent: false,
    backgroundColor: '#0a0a0a',
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: { sandbox: true },
  })
  splashWindow.loadFile(getSplashPath())
  splashWindow.once('ready-to-show', () => splashWindow?.show())
  splashWindow.on('closed', () => { splashWindow = null })
}

async function createWindow() {
  showSplash()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  await getDb()
  initSupabaseFromSettings()

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close()
    mainWindow?.show()
  })
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.on('close', () => {
    if (process.platform === 'win32') app.quit()
  })
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools()
    }
  })
}

function registerMediaProtocol() {
  const userDataPath = app.getPath('userData')
  const designsDir = path.join(userDataPath, 'designs')
  if (!fs.existsSync(designsDir)) fs.mkdirSync(designsDir, { recursive: true })

  protocol.handle(MEDIA_PROTOCOL, (request) => {
    const url = new URL(request.url)
    let filePath = decodeURIComponent(url.pathname)
    // For media:///C:/path, pathname is /C:/path → strip leading slash
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.substring(1)
    }
    filePath = filePath.replace(/\//g, '\\')
    // Read file and return as Response
    try {
      const data = fs.readFileSync(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
      }
      return new Response(data, { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' } })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

async function compressImage(inputPath: string, outputPath: string): Promise<void> {
  try {
    const image = await Jimp.read(inputPath) as any
    const maxDim = 1920
    if (image.bitmap.width > maxDim || image.bitmap.height > maxDim) image.scaleToFit({ w: maxDim, h: maxDim })
    await image.write(outputPath, { quality: 82 } as any)
  } catch {
    fs.copyFileSync(inputPath, outputPath)
  }
}

async function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  try {
    const image = await Jimp.read(inputPath) as any
    image.scaleToFit({ w: 400, h: 300 })
    await image.write(outputPath, { quality: 70 } as any)
  } catch {
    // silently fail if thumbnail can't be made
  }
}

async function compressAndCopyImage(srcPath: string, destDir: string, fileName: string): Promise<{ filePath: string; thumbPath: string }> {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  const ext = path.extname(srcPath).toLowerCase()
  const destPath = path.join(destDir, fileName)
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    await compressImage(srcPath, destPath)
  } else {
    fs.copyFileSync(srcPath, destPath)
  }
  return { filePath: destPath, thumbPath: destPath }
}

function sendProgress(progress: number) {
  mainWindow?.webContents.send('export:progress', progress)
}

function initSupabaseFromSettings() {
  try {
    const url = (queryOne('SELECT value FROM settings WHERE key = ?', ['supabase_url']) as any)?.value
    const key = (queryOne('SELECT value FROM settings WHERE key = ?', ['supabase_anon_key']) as any)?.value
    const use = (queryOne('SELECT value FROM settings WHERE key = ?', ['use_supabase']) as any)?.value
    if (url && key) {
      configureSupabase(url, key)
      supabaseService.configureSupabase(url, key)
      supabaseService.setEnabled(use === 'true')
    }
  } catch {}
}

function saveSupabaseMode(enabled: boolean) {
  execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['use_supabase', enabled ? 'true' : 'false'])
  supabaseService.setEnabled(enabled)
}

function registerIpcHandlers() {
  // -- Clients --
  ipcMain.handle('clients:list', () => {
    if (supabaseService.isEnabled()) return supabaseService.listClients()
    return queryAll('SELECT * FROM clients ORDER BY created_at DESC')
  })

  ipcMain.handle('clients:create', async (_event, data) => {
    if (supabaseService.isEnabled()) return supabaseService.createClient(data)
    const id = uuidv4()
    execute('INSERT INTO clients (id, name, email, company, color, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name, data.email || '', data.company || '', data.color || '#6366f1', data.notes || ''])
    return queryOne('SELECT * FROM clients WHERE id = ?', [id])
  })

  ipcMain.handle('clients:update', async (_event, id, data) => {
    if (supabaseService.isEnabled()) return supabaseService.updateClient(id, data)
    const fields: string[] = []; const values: any[] = []
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) { fields.push(`${k} = ?`); values.push(v) }
    }
    if (fields.length > 0) { values.push(id); execute(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values) }
    return queryOne('SELECT * FROM clients WHERE id = ?', [id])
  })

  ipcMain.handle('clients:delete', async (_event, id) => {
    if (supabaseService.isEnabled()) return supabaseService.deleteClient(id)
    for (const d of queryAll('SELECT file_path, thumbnail_path FROM designs WHERE client_id = ?', [id])) {
      if (d.file_path && fs.existsSync(d.file_path)) fs.unlinkSync(d.file_path)
      if (d.thumbnail_path && fs.existsSync(d.thumbnail_path)) fs.unlinkSync(d.thumbnail_path)
    }
    for (const r of queryAll('SELECT file_path FROM reports WHERE client_id = ?', [id])) {
      if (r.file_path && fs.existsSync(r.file_path)) fs.unlinkSync(r.file_path)
    }
    execute('DELETE FROM designs WHERE client_id = ?', [id])
    execute('DELETE FROM reports WHERE client_id = ?', [id])
    execute('DELETE FROM clients WHERE id = ?', [id])
  })

  // -- Logo --
  ipcMain.handle('clients:upload-logo', async (_event, clientId, filePath) => {
    if (supabaseService.isEnabled()) {
      const logosDir = path.join(app.getPath('userData'), 'logos_temp')
      const ext = path.extname(filePath) || '.png'
      const { filePath: compressedPath } = await compressAndCopyImage(filePath, logosDir, `${clientId}${ext}`)
      try {
        return await supabaseService.uploadClientLogo(clientId, compressedPath)
      } catch {
        return supabaseService.uploadClientLogo(clientId, filePath)
      }
    }
    const logosDir = path.join(app.getPath('userData'), 'logos')
    const ext = path.extname(filePath) || '.png'
    const destPath = await compressAndCopyImage(filePath, logosDir, `${clientId}${ext}`)
    execute('UPDATE clients SET logo_path = ? WHERE id = ?', [destPath, clientId])
    return queryOne('SELECT * FROM clients WHERE id = ?', [clientId])
  })

  ipcMain.handle('clients:remove-logo', async (_event, clientId) => {
    if (supabaseService.isEnabled()) return supabaseService.removeClientLogo(clientId)
    const client = queryOne('SELECT * FROM clients WHERE id = ?', [clientId])
    if (client?.logo_path && fs.existsSync(client.logo_path)) fs.unlinkSync(client.logo_path)
    execute("UPDATE clients SET logo_path = '' WHERE id = ?", [clientId])
    return queryOne('SELECT * FROM clients WHERE id = ?', [clientId])
  })

  // -- Designs --
  ipcMain.handle('designs:list', async (_event, clientId, month?, year?) => {
    if (supabaseService.isEnabled()) return supabaseService.listDesigns(clientId, month, year)
    if (month !== undefined && year !== undefined) {
      return queryAll(
        `SELECT * FROM designs WHERE client_id = ? AND substr(design_date, 6, 2) = printf('%02d', ?)
         AND substr(design_date, 1, 4) = ? ORDER BY sort_order ASC, design_date ASC, created_at ASC`,
        [clientId, month, String(year)])
    }
    return queryAll('SELECT * FROM designs WHERE client_id = ? ORDER BY sort_order ASC, design_date DESC, created_at DESC', [clientId])
  })

  ipcMain.handle('designs:create', async (_event, data) => {
    if (supabaseService.isEnabled()) {
      const id = uuidv4()
      const designsDir = path.join(app.getPath('userData'), 'designs', data.clientId)
      const ext = path.extname(data.filePath) || '.jpg'
      const { filePath, thumbPath } = await compressAndCopyImage(data.filePath, designsDir, `${id}${ext}`)
      const result = await supabaseService.createDesign({ id, clientId: data.clientId, title: data.title, description: data.description || '', category: data.category || '', sort_order: data.sortOrder ?? 0, file_name: data.fileName, file_path: filePath, thumbnail_path: thumbPath, design_date: data.designDate, price: data.price ?? 0, platform: data.platform || '', platform_cost: data.platform_cost ?? 0 })
      // Fire-and-forget upload to Storage — no bloquea al usuario
      supabaseService.uploadFile('designs', `${data.clientId}/${id}${ext}`, filePath, 10000)
        .then(async (fileUrl) => {
          if (fileUrl) supabaseService.updateDesign(id, { file_url: fileUrl })
        })
        .catch(() => {})
      if (thumbPath && fs.existsSync(thumbPath)) {
        supabaseService.uploadFile('designs', `${data.clientId}/${id}_thumb${ext}`, thumbPath, 10000)
          .then(async (thumbUrl) => {
            if (thumbUrl) supabaseService.updateDesign(id, { thumbnail_url: thumbUrl })
          })
          .catch(() => {})
      }
      return result
    }
    const id = uuidv4()
    const designsDir = path.join(app.getPath('userData'), 'designs', data.clientId)
    const ext = path.extname(data.filePath) || '.jpg'
    const { filePath, thumbPath } = await compressAndCopyImage(data.filePath, designsDir, `${id}${ext}`)
    execute(
      'INSERT INTO designs (id, client_id, title, description, category, sort_order, file_name, file_path, thumbnail_path, design_date, price, platform, platform_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.clientId, data.title, data.description || '', data.category || '', data.sortOrder ?? 0, data.fileName, filePath, thumbPath, data.designDate, data.price ?? 0, data.platform || '', data.platform_cost ?? 0])
    return queryOne('SELECT * FROM designs WHERE id = ?', [id])
  })

  ipcMain.handle('designs:update', async (_event, id, data) => {
    if (supabaseService.isEnabled()) return supabaseService.updateDesign(id, data)
    const fields: string[] = []; const values: any[] = []
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) { fields.push(`${k} = ?`); values.push(v) }
    }
    if (fields.length > 0) { values.push(id); execute(`UPDATE designs SET ${fields.join(', ')} WHERE id = ?`, values) }
    return queryOne('SELECT * FROM designs WHERE id = ?', [id])
  })

  ipcMain.handle('designs:replace-image', async (_event, id: string, newPath: string) => {
    const design = supabaseService.isEnabled()
      ? await supabaseService.getDesign(id)
      : queryOne('SELECT * FROM designs WHERE id = ?', [id]) as any
    if (!design) throw new Error('Design not found')
    const clientId = design.client_id || design.clientId
    const designsDir = path.join(app.getPath('userData'), 'designs', clientId)
    const ext = path.extname(newPath) || '.jpg'
    if (design.file_path && fs.existsSync(design.file_path)) fs.unlinkSync(design.file_path)
    if (design.thumbnail_path && fs.existsSync(design.thumbnail_path)) fs.unlinkSync(design.thumbnail_path)
    const { filePath } = await compressAndCopyImage(newPath, designsDir, `${id}${ext}`)
    if (supabaseService.isEnabled()) {
      const updated = await supabaseService.updateDesign(id, { file_path: filePath, file_name: path.basename(newPath) })
      supabaseService.uploadFile('designs', `${clientId}/${id}${ext}`, filePath, 10000).then((url) => {
        if (url) supabaseService.updateDesign(id, { file_url: url })
      }).catch(() => {})
      return updated
    }
    execute('UPDATE designs SET file_path = ?, file_name = ?, thumbnail_path = ? WHERE id = ?', [filePath, path.basename(newPath), '', id])
    return queryOne('SELECT * FROM designs WHERE id = ?', [id])
  })

  // ── Templates ──
  ipcMain.handle('templates:list', async () => {
    if (supabaseService.isEnabled()) return supabaseService.listTemplates()
    return queryAll('SELECT * FROM design_templates ORDER BY name ASC')
  })
  ipcMain.handle('templates:create', async (_e, data: any) => {
    if (supabaseService.isEnabled()) return supabaseService.createTemplate({ ...data, id: uuidv4() })
    const id = uuidv4()
    execute('INSERT INTO design_templates (id,name,category,price) VALUES (?,?,?,?)', [id, data.name, data.category||'', data.price||0])
    return queryOne('SELECT * FROM design_templates WHERE id=?', [id])
  })
  ipcMain.handle('templates:delete', async (_e, id: string) => {
    if (supabaseService.isEnabled()) { await supabaseService.deleteTemplate(id); return true }
    execute('DELETE FROM design_templates WHERE id=?', [id]); return true
  })

  // ── Proforma Template ──
  async function renderPdfPageToPng(pdfPath: string, outputPath: string): Promise<boolean> {
    try {
      const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
      const pdfUrl = `file:///${pdfPath.replace(/\\/g, '/')}`
      await win.loadURL(pdfUrl)
      await new Promise(r => setTimeout(r, 1500))
      const image = await win.webContents.capturePage()
      fs.writeFileSync(outputPath, image.toPNG())
      win.close()
      return true
    } catch { return false }
  }

  ipcMain.handle('proforma-template:upload', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Plantilla (PDF, PNG, JPG)', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const srcPath = result.filePaths[0]
    const templatesDir = path.join(app.getPath('userData'), 'proforma_template')
    if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true })
    const ext = path.extname(srcPath).toLowerCase()

    if (ext === '.pdf') {
      const destPath = path.join(templatesDir, 'template.pdf')
      fs.copyFileSync(srcPath, destPath)
      const pngPath = path.join(templatesDir, 'template.png')
      const ok = await renderPdfPageToPng(destPath, pngPath)
      if (ok) {
        execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['proforma_template_path', pngPath])
        return { path: pngPath, previewPath: pngPath, exists: true }
      }
      // If PDF conversion fails, store PDF path anyway
      execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['proforma_template_path', destPath])
      return { path: destPath, previewPath: destPath, exists: true, warning: 'No se pudo convertir el PDF. Prueba exportar como PNG desde Affinity.' }
    }

    // Image file (PNG/JPG)
    const destName = `template${ext}`
    const destPath = path.join(templatesDir, destName)
    fs.copyFileSync(srcPath, destPath)
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['proforma_template_path', destPath])
    return { path: destPath, previewPath: destPath, exists: true }
  })

  ipcMain.handle('proforma-template:get', () => {
    const storedPath = (queryOne('SELECT value FROM settings WHERE key = ?', ['proforma_template_path']) as any)?.value
    if (storedPath && fs.existsSync(storedPath)) {
      return { path: storedPath, previewPath: storedPath, exists: true }
    }
    return { path: null, previewPath: null, exists: false }
  })

  ipcMain.handle('proforma-template:remove', () => {
    const templatesDir = path.join(app.getPath('userData'), 'proforma_template')
    if (fs.existsSync(templatesDir)) fs.rmSync(templatesDir, { recursive: true })
    execute('DELETE FROM settings WHERE key = ?', ['proforma_template_path'])
    return { exists: false }
  })

  // ── Products ──
  ipcMain.handle('products:list', async () => {
    if (supabaseService.isEnabled()) return supabaseService.listProducts()
    return queryAll('SELECT * FROM products ORDER BY name ASC')
  })
  ipcMain.handle('products:create', async (_e, data) => {
    if (supabaseService.isEnabled()) return supabaseService.createProduct(data)
    const id = uuidv4()
    execute('INSERT INTO products (id, name, category, price) VALUES (?,?,?,?)', [id, data.name, data.category || '', data.price || 0])
    return queryOne('SELECT * FROM products WHERE id=?', [id])
  })
  ipcMain.handle('products:update', async (_e, id: string, data) => {
    if (supabaseService.isEnabled()) return supabaseService.updateProduct(id, data)
    const fields: string[] = []; const values: any[] = []
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) { fields.push(`${k} = ?`); values.push(v) }
    }
    if (fields.length > 0) { values.push(id); execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values) }
    return queryOne('SELECT * FROM products WHERE id=?', [id])
  })
  ipcMain.handle('products:delete', async (_e, id: string) => {
    if (supabaseService.isEnabled()) { await supabaseService.deleteProduct(id); return true }
    execute('DELETE FROM products WHERE id=?', [id]); return true
  })

  // ── Packages ──
  ipcMain.handle('packages:list', async () => {
    if (supabaseService.isEnabled()) return supabaseService.listPackages()
    const pkgs = queryAll('SELECT * FROM packages ORDER BY name ASC')
    for (const pkg of pkgs) {
      (pkg as any).items = queryAll('SELECT * FROM package_items WHERE package_id=? ORDER BY id ASC', [pkg.id])
    }
    return pkgs
  })
  ipcMain.handle('packages:create', async (_e, data) => {
    if (supabaseService.isEnabled()) return supabaseService.createPackage(data)
    const id = uuidv4()
    execute('INSERT INTO packages (id, name, description) VALUES (?,?,?)', [id, data.name, data.description || ''])
    for (const item of data.items || []) {
      execute('INSERT INTO package_items (id, package_id, description, category, quantity, price) VALUES (?,?,?,?,?,?)',
        [uuidv4(), id, item.description, item.category || '', item.quantity || 1, item.price || 0])
    }
    return queryOne('SELECT * FROM packages WHERE id=?', [id])
  })
  ipcMain.handle('packages:update', async (_e, id: string, data) => {
    if (supabaseService.isEnabled()) return supabaseService.updatePackage(id, data)
    const fields: string[] = []; const values: any[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (fields.length > 0) { values.push(id); execute(`UPDATE packages SET ${fields.join(', ')} WHERE id = ?`, values) }
    if (data.items !== undefined) {
      execute('DELETE FROM package_items WHERE package_id=?', [id])
      for (const item of data.items) {
        execute('INSERT INTO package_items (id, package_id, description, category, quantity, price) VALUES (?,?,?,?,?,?)',
          [uuidv4(), id, item.description, item.category || '', item.quantity || 1, item.price || 0])
      }
    }
    return queryOne('SELECT * FROM packages WHERE id=?', [id])
  })
  ipcMain.handle('packages:delete', async (_e, id: string) => {
    if (supabaseService.isEnabled()) { await supabaseService.deletePackage(id); return true }
    execute('DELETE FROM packages WHERE id=?', [id]); return true
  })

  // ── Tags ──
  ipcMain.handle('tags:get', async (_e, designId: string) => {
    if (supabaseService.isEnabled()) return supabaseService.getTags(designId)
    return queryAll('SELECT tag FROM design_tags WHERE design_id=?', [designId]).map((r:any)=>r.tag)
  })
  ipcMain.handle('tags:set', async (_e, designId: string, tags: string[]) => {
    if (supabaseService.isEnabled()) { await supabaseService.setTags(designId, tags); return true }
    execute('DELETE FROM design_tags WHERE design_id=?', [designId])
    tags.forEach(tag => execute('INSERT INTO design_tags (id,design_id,tag) VALUES (?,?,?)', [uuidv4(), designId, tag]))
    return true
  })
  ipcMain.handle('tags:all', async () => {
    if (supabaseService.isEnabled()) return supabaseService.getAllTags()
    return queryAll('SELECT DISTINCT tag FROM design_tags ORDER BY tag ASC').map((r:any)=>r.tag)
  })

  // ── Client Notes ──
  ipcMain.handle('clientNotes:list', async (_e, clientId: string) => {
    if (supabaseService.isEnabled()) return supabaseService.listClientNotes(clientId)
    return queryAll('SELECT * FROM client_notes WHERE client_id=? ORDER BY created_at DESC', [clientId])
  })
  ipcMain.handle('clientNotes:add', async (_e, clientId: string, note: string) => {
    if (supabaseService.isEnabled()) return supabaseService.addClientNote(clientId, note)
    const id = uuidv4()
    execute('INSERT INTO client_notes (id,client_id,note) VALUES (?,?,?)', [id, clientId, note])
    return queryOne('SELECT * FROM client_notes WHERE id=?', [id])
  })
  ipcMain.handle('clientNotes:delete', async (_e, id: string) => {
    if (supabaseService.isEnabled()) { await supabaseService.deleteClientNote(id); return true }
    execute('DELETE FROM client_notes WHERE id=?', [id]); return true
  })

  // ── Monthly Goals ──
  ipcMain.handle('goals:get', async (_e, month: number, year: number) => {
    if (supabaseService.isEnabled()) return supabaseService.getGoal(month, year)
    return queryOne('SELECT * FROM monthly_goals WHERE month=? AND year=?', [month, year])
  })
  ipcMain.handle('goals:set', async (_e, month: number, year: number, goal: number) => {
    if (supabaseService.isEnabled()) return supabaseService.setGoal(month, year, goal)
    execute('INSERT INTO monthly_goals (id,month,year,goal) VALUES (?,?,?,?) ON CONFLICT(month,year) DO UPDATE SET goal=excluded.goal', [uuidv4(), month, year, goal])
    return queryOne('SELECT * FROM monthly_goals WHERE month=? AND year=?', [month, year])
  })

  // ── Client Status ──
  ipcMain.handle('clients:setStatus', async (_e, id: string, status: string) => {
    if (supabaseService.isEnabled()) return supabaseService.setClientStatus(id, status)
    execute('UPDATE clients SET status=? WHERE id=?', [status, id])
    return queryOne('SELECT * FROM clients WHERE id=?', [id])
  })

  // ── Window controls ──
  ipcMain.on('win:minimize', () => mainWindow?.minimize())
  ipcMain.on('win:maximize', () => { if(mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
  ipcMain.on('win:close', () => mainWindow?.close())
  ipcMain.handle('win:isMaximized', () => mainWindow?.isMaximized() ?? false)

  async function getCompanySettings() {
    if (supabaseService.isEnabled()) {
      const [name, ruc, phone, website, logo] = await Promise.all([
        supabaseService.getSetting('company_name'),
        supabaseService.getSetting('company_ruc'),
        supabaseService.getSetting('company_phone'),
        supabaseService.getSetting('company_website'),
        supabaseService.getSetting('company_logo_path'),
      ])
      return { name: name || '', ruc: ruc || '', phone: phone || '', website: website || '', logoPath: logo || '' }
    }
    return {
      name: (queryOne('SELECT value FROM settings WHERE key = ?', ['company_name']) as any)?.value || '',
      ruc: (queryOne('SELECT value FROM settings WHERE key = ?', ['company_ruc']) as any)?.value || '',
      phone: (queryOne('SELECT value FROM settings WHERE key = ?', ['company_phone']) as any)?.value || '',
      website: (queryOne('SELECT value FROM settings WHERE key = ?', ['company_website']) as any)?.value || '',
      logoPath: (queryOne('SELECT value FROM settings WHERE key = ?', ['company_logo_path']) as any)?.value || '',
    }
  }

  ipcMain.handle('proforma:generate', async (_e, data: any) => {
    const company = await getCompanySettings()
    // Check for proforma template — convert PDF to PNG if needed
    let templatePath = ''
    const storedPath = supabaseService.isEnabled()
      ? await supabaseService.getSetting('proforma_template_path')
      : (queryOne('SELECT value FROM settings WHERE key = ?', ['proforma_template_path']) as any)?.value
    if (storedPath && fs.existsSync(storedPath)) {
      const ext = path.extname(storedPath).toLowerCase()
      if (ext === '.pdf') {
        const pngPath = storedPath.replace(/\.pdf$/i, '_converted.png')
        if (!fs.existsSync(pngPath)) {
          await renderPdfPageToPng(storedPath, pngPath)
        }
        if (fs.existsSync(pngPath)) templatePath = pngPath
      } else {
        templatePath = storedPath
      }
    }
    const saveResult = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('desktop'), `${data.proformaNum}.pdf`),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (saveResult.canceled || !saveResult.filePath) return null
    await generateProformaPDF({ ...data, company, outputPath: saveResult.filePath, templatePath })
    if (fs.existsSync(saveResult.filePath)) shell.openPath(path.dirname(saveResult.filePath))
    return saveResult.filePath
  })

  ipcMain.handle('designs:togglePaid', async (_event, id) => {
    if (supabaseService.isEnabled()) return supabaseService.toggleDesignPaid(id)
    const design = queryOne('SELECT * FROM designs WHERE id = ?', [id])
    if (!design) throw new Error('Design not found')
    const newPaid = design.paid ? 0 : 1
    execute('UPDATE designs SET paid = ? WHERE id = ?', [newPaid, id])
    return newPaid === 1
  })

  ipcMain.handle('designs:delete', async (_event, id) => {
    if (supabaseService.isEnabled()) return supabaseService.deleteDesign(id)
    const d = queryOne('SELECT * FROM designs WHERE id = ?', [id])
    if (d) {
      if (fs.existsSync(d.file_path)) fs.unlinkSync(d.file_path)
      execute('DELETE FROM designs WHERE id = ?', [id])
    }
  })

  ipcMain.handle('designs:batch-reorder', async (_event, items) => {
    if (supabaseService.isEnabled()) return supabaseService.batchReorderDesigns(items)
    for (const item of items) {
      execute('UPDATE designs SET sort_order = ? WHERE id = ?', [item.sort_order, item.id])
    }
  })

  ipcMain.handle('designs:list-by-month', async (_event, clientId, month, year) => {
    if (supabaseService.isEnabled()) return supabaseService.listDesignsByMonth(clientId, month, year)
    return queryAll(
      `SELECT * FROM designs WHERE client_id = ? AND substr(design_date, 6, 2) = printf('%02d', ?)
       AND substr(design_date, 1, 4) = ? ORDER BY sort_order ASC, design_date ASC`,
      [clientId, month, String(year)])
  })

  // -- Reports --
  ipcMain.handle('report:generate', async (_event, clientId, month, year, personalMessage, templateColor, templateStyle, watermark) => {
    const client = supabaseService.isEnabled()
      ? await supabaseService.getClient(clientId)
      : queryOne('SELECT * FROM clients WHERE id = ?', [clientId])
    if (!client) throw new Error('Client not found')

    const company = await getCompanySettings()

    const designs = supabaseService.isEnabled()
      ? await supabaseService.listDesignsByMonth(clientId, month, year)
      : queryAll(
        `SELECT * FROM designs WHERE client_id = ? AND substr(design_date, 6, 2) = printf('%02d', ?)
         AND substr(design_date, 1, 4) = ? ORDER BY sort_order ASC, design_date ASC`,
        [clientId, month, String(year)])

    if (designs.length === 0) throw new Error('No hay diseños para este mes')

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    const defaultName = `${client.name.replace(/\s+/g, '_')}_${monthNames[month - 1]}_${year}.pdf`

    // Guardar siempre directo al escritorio primero
    const desktopPath = path.join(app.getPath('desktop'), defaultName)

    // Mostrar diálogo para que el usuario elija dónde guardar
    const saveResult = await dialog.showSaveDialog({
      defaultPath: desktopPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (saveResult.canceled || !saveResult.filePath) return null

    const outputPath = saveResult.filePath

    // Generar PDF
    await generatePDF({
      client,
      designs,
      month,
      year,
      monthName: monthNames[month - 1],
      personalMessage: personalMessage || '',
      templateColor: templateColor || '#6366f1',
      templateStyle: templateStyle || 'classic',
      watermark: watermark || '',
      outputPath,
      company, // <-- datos de la empresa
      onProgress: (p) => sendProgress(p),
    })

    // Verificar que el archivo realmente se creó
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error('El PDF no se generó correctamente')
    }

    return outputPath
  })

  ipcMain.handle('reports:list', async (_event, clientId) => {
    if (supabaseService.isEnabled()) return supabaseService.listReports(clientId)
    return queryAll('SELECT * FROM reports WHERE client_id = ? ORDER BY year DESC, month DESC', [clientId])
  })

  // -- Backup (with dialogs) --
  ipcMain.handle('backup:create-dialog', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `design-reports-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return null
    saveDb()
    const ar = await getArchiver()
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(result.filePath!)
      const archive = ar('zip', { zlib: { level: 9 } })
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      archive.directory(app.getPath('userData'), 'backup', { ignore: (n: string) => n.startsWith('__') })
      archive.finalize()
    })
    return result.filePath
  })

  ipcMain.handle('backup:restore-dialog', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return false

    const filePath = result.filePaths[0]
    const userData = app.getPath('userData')
    const extractDir = path.join(userData, '..', 'restore-temp')
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true })
    fs.mkdirSync(extractDir, { recursive: true })

    const extract = (await import('extract-zip')).default
    await extract(filePath, { dir: extractDir })

    const backupDir = path.join(extractDir, 'backup')
    if (fs.existsSync(backupDir)) {
      const entries = fs.readdirSync(backupDir)
      for (const entry of entries) {
        const src = path.join(backupDir, entry)
        const dst = path.join(userData, entry)
        if (fs.statSync(src).isDirectory()) {
          if (fs.existsSync(dst)) fs.rmSync(dst, { recursive: true })
          fs.cpSync(src, dst, { recursive: true })
        } else {
          fs.copyFileSync(src, dst)
        }
      }
    }

    fs.rmSync(extractDir, { recursive: true })
    closeDb()
    await getDb()
    return true
  })

  // -- Export ZIP (with dialog) --
  ipcMain.handle('export:client-zip', async (_event, clientId, month, year) => {
    const client = queryOne('SELECT * FROM clients WHERE id = ?', [clientId])
    if (!client) throw new Error('Client not found')

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    const result = await dialog.showSaveDialog({
      defaultPath: `${client.name.replace(/\s+/g, '_')}_${monthNames[month - 1]}_${year}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return null

    const designs = queryAll(
      `SELECT * FROM designs WHERE client_id = ? AND substr(design_date, 6, 2) = printf('%02d', ?)
       AND substr(design_date, 1, 4) = ? ORDER BY sort_order ASC, design_date ASC`,
      [clientId, month, String(year)])

    // Generate PDF first
    const reportsDir = path.join(app.getPath('userData'), 'reports')
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
    const pdfPath = path.join(reportsDir, `temp_${uuidv4()}.pdf`)

    await generatePDF({
      client, designs, month, year, monthName: monthNames[month - 1],
      personalMessage: '', templateColor: '#6366f1', outputPath: pdfPath,
      onProgress: () => {},
    })

    // Create ZIP
    const outputPath = result.filePath
    const ar = await getArchiver()
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(outputPath)
      const archive = ar('zip', { zlib: { level: 9 } })
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      archive.file(pdfPath, { name: `Informe_${monthNames[month - 1]}_${year}.pdf` })

      for (const d of designs) {
        if (d.file_path && fs.existsSync(d.file_path)) {
          archive.file(d.file_path, { name: `disenos/${d.title.replace(/[^a-zA-Z0-9]/g, '_')}${path.extname(d.file_path)}` })
        }
      }

      archive.finalize()
    })

    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
    return outputPath
  })

  // -- Settings --
  ipcMain.handle('settings:get', async (_event, key) => {
    if (supabaseService.isEnabled()) return supabaseService.getSetting(key)
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [key])
    return row ? row.value : null
  })

  ipcMain.handle('settings:set', async (_event, key, value) => {
    if (supabaseService.isEnabled()) { await supabaseService.setSetting(key, value); return }
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
  })

  ipcMain.handle('settings:set-company-logo', async (_event, filePath: string) => {
    const logosDir = path.join(app.getPath('userData'), 'company')
    if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true })
    const ext = path.extname(filePath) || '.png'
    const result = await compressAndCopyImage(filePath, logosDir, `logo${ext}`)
    if (supabaseService.isEnabled()) {
      const url = await supabaseService.uploadFile('company', `logo${ext}`, result.filePath)
      await supabaseService.setSetting('company_logo_url', url)
    }
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['company_logo_path', result.filePath])
    return result.filePath
  })

  // -- Dialogs --
  ipcMain.handle('dialog:select-image', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }] })
    return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
  })

  ipcMain.handle('dialog:select-images', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }] })
    return r.canceled ? [] : r.filePaths
  })

  ipcMain.handle('dialog:select-save-path', async (_event, defaultName) => {
    const r = await dialog.showSaveDialog({ defaultPath: defaultName, filters: [{ name: 'All', extensions: ['*'] }] })
    return r.canceled ? null : r.filePath
  })

  // -- Shell --
  ipcMain.handle('shell:open-folder', (_event, filePath) => shell.showItemInFolder(filePath))

  ipcMain.handle('notify', async (_event, title, body) => {
    const { Notification } = require('electron')
    if (Notification.isSupported()) new Notification({ title, body }).show()
  })

  ipcMain.handle('shell:open-mailto', (_event, to, subject, body) => {
    shell.openExternal(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  })

  // -- URL Import --
  ipcMain.handle('url:download-image', async (_event, url: string) => {
    const https = require('https')
    const http = require('http')
    const tmpDir = path.join(app.getPath('userData'), 'temp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const ext = '.jpg'
    const fileName = `url_${uuidv4()}${ext}`
    const tmpPath = path.join(tmpDir, fileName)

    await new Promise<void>((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      client.get(url, (res: any) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          client.get(res.headers.location, (res2: any) => {
            const file = fs.createWriteStream(tmpPath)
            res2.pipe(file)
            file.on('finish', () => { file.close(); resolve() })
          }).on('error', reject)
          return
        }
        const file = fs.createWriteStream(tmpPath)
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      }).on('error', reject)
    })

    return tmpPath
  })

  // -- Export single image --
  ipcMain.handle('designs:export-image', async (_event, designId: string) => {
    const design = queryOne('SELECT * FROM designs WHERE id = ?', [designId])
    if (!design) throw new Error('Design not found')
    const ext = path.extname(design.file_path)
    const result = await dialog.showSaveDialog({
      defaultPath: `${design.title.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`,
      filters: [{ name: 'Image', extensions: [ext.replace('.', '')] }],
    })
    if (result.canceled || !result.filePath) return null
    fs.copyFileSync(design.file_path, result.filePath)
    return result.filePath
  })

  // -- Toggle favorite --
  ipcMain.handle('designs:toggle-favorite', async (_event, designId: string) => {
    if (supabaseService.isEnabled()) return supabaseService.toggleDesignFavorite(designId)
    const design = queryOne('SELECT * FROM designs WHERE id = ?', [designId])
    if (!design) throw new Error('Design not found')
    const newVal = design.favorite ? 0 : 1
    execute('UPDATE designs SET favorite = ? WHERE id = ?', [newVal, designId])
    return { ...design, favorite: newVal }
  })

  // -- Generar galería HTML --
  ipcMain.handle('export:gallery-html', async (_event, clientId: string, month: number, year: number) => {
    const client = queryOne('SELECT * FROM clients WHERE id = ?', [clientId])
    if (!client) throw new Error('Client not found')

    const designs = queryAll(
      `SELECT * FROM designs WHERE client_id = ? AND substr(design_date, 6, 2) = printf('%02d', ?)
       AND substr(design_date, 1, 4) = ? ORDER BY sort_order ASC, design_date ASC`,
      [clientId, month, String(year)])
    if (designs.length === 0) throw new Error('No designs for this month')

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const mn = monthNames[month - 1]

    const totalPrice = designs.reduce((s: number, d: any) => s + (d.price || 0), 0)
    const imagesHtml = designs.map((d: any) => {
      const imgB64 = fs.existsSync(d.file_path)
        ? fs.readFileSync(d.file_path).toString('base64')
        : ''
      const ext = path.extname(d.file_path).replace('.', '')
      const src = imgB64 ? `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${imgB64}` : ''
      return `<div class="item">
        <img src="${src}" alt="${escapeHtml(d.title)}" loading="lazy" />
        <div class="info">
          <strong>${escapeHtml(d.title)}</strong>
          ${d.category ? `<span>${escapeHtml(d.category)}</span>` : ''}
          ${d.price ? `<span class="price">$${Number(d.price).toFixed(2)}</span>` : ''}
        </div>
      </div>`
    }).join('\n')

    const html = `<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(client.name)} — ${mn} ${year}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#171717}
        header{text-align:center;padding:48px 24px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
        header h1{font-size:28px;font-weight:700;margin-bottom:4px}
        header p{opacity:.8;font-size:14px}
        header .total{font-size:18px;font-weight:600;margin-top:8px;opacity:1}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:24px;max-width:1200px;margin:0 auto}
        .item{border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);transition:transform .2s}
        .item:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.12)}
        .item img{width:100%;object-fit:contain;display:block;background:#f0f0f0}
        .info{padding:12px 16px}
        .info strong{display:block;font-size:14px;margin-bottom:2px}
        .info span{font-size:12px;color:#737373}
        .info .price{color:#22c55e;font-weight:600;font-size:13px}
        footer{text-align:center;padding:32px;color:#a3a3a3;font-size:12px}
        @media(max-width:640px){.grid{grid-template-columns:1fr;padding:16px}}
      </style>
    </head><body>
      <header>
        <h1>${escapeHtml(client.name)}</h1>
        <p>${mn} ${year} — ${designs.length} diseño${designs.length !== 1 ? 's' : ''}${totalPrice > 0 ? `</p><p class="total">Total: $${totalPrice.toFixed(2)}` : ''}</p>
      </header>
      <div class="grid">${imagesHtml}</div>
      <footer>Design Reports</footer>
    </body></html>`

    const reportsDir = path.join(app.getPath('userData'), 'exports')
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
    const fileName = `${client.name.replace(/\s+/g, '_')}_${mn}_${year}_galeria.html`
    const filePath = path.join(reportsDir, fileName)
    fs.writeFileSync(filePath, html, 'utf-8')
    return filePath
  })

  // -- Exportar cliente individual (JSON + ZIP) --
  ipcMain.handle('export:client-data', async (_event, clientId: string) => {
    const client = queryOne('SELECT * FROM clients WHERE id = ?', [clientId])
    if (!client) throw new Error('Client not found')

    const designs = queryAll('SELECT * FROM designs WHERE client_id = ? ORDER BY design_date', [clientId])
    const reports = queryAll('SELECT * FROM reports WHERE client_id = ? ORDER BY year, month', [clientId])

    const result = await dialog.showSaveDialog({
      defaultPath: `${client.name.replace(/\s+/g, '_')}_data.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePath) return null

    // Write JSON manifest
    const tmpDir = path.join(app.getPath('userData'), 'temp', uuidv4())
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'client.json'), JSON.stringify({ client, designs, reports }, null, 2), 'utf-8')

    const ar = await getArchiver()
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(result.filePath!)
      const archive = ar('zip', { zlib: { level: 9 } })
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      archive.file(path.join(tmpDir, 'client.json'), { name: 'client.json' })
      for (const d of designs) {
        if (d.file_path && fs.existsSync(d.file_path)) {
          archive.file(d.file_path, { name: `designs/${d.file_name}` })
        }
      }
      archive.finalize()
    })

    fs.rmSync(tmpDir, { recursive: true })
    return result.filePath
  })

  // -- Global Search --
  ipcMain.handle('search:designs', async (_event, query: string) => {
    if (!query.trim()) return []
    if (supabaseService.isEnabled()) return supabaseService.searchDesigns(query)
    const term = `%${query.trim()}%`
    return queryAll(
      `SELECT d.*, c.name as client_name FROM designs d
       JOIN clients c ON c.id = d.client_id
       WHERE d.title LIKE ? OR d.description LIKE ? OR c.name LIKE ?
       ORDER BY d.created_at DESC LIMIT 50`,
      [term, term, term])
  })

  // -- Supabase Migration --
  ipcMain.handle('migration:run', async (_event, supabaseUrl, supabaseAnonKey) => {
    configureSupabase(supabaseUrl, supabaseAnonKey)
    const logs: string[] = []
    await runMigration((msg) => { logs.push(msg); console.log(msg) })
    return logs
  })

  ipcMain.handle('migration:save-config', (_event, supabaseUrl, supabaseAnonKey) => {
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['supabase_url', supabaseUrl])
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['supabase_anon_key', supabaseAnonKey])
    configureSupabase(supabaseUrl, supabaseAnonKey)
    supabaseService.configureSupabase(supabaseUrl, supabaseAnonKey)
  })

  ipcMain.handle('migration:get-config', () => {
    const url = queryOne('SELECT value FROM settings WHERE key = ?', ['supabase_url'])
    const key = queryOne('SELECT value FROM settings WHERE key = ?', ['supabase_anon_key'])
    return { supabaseUrl: (url as any)?.value || '', supabaseAnonKey: (key as any)?.value || '' }
  })

  ipcMain.handle('migration:set-mode', async (_event, enabled: boolean) => {
    saveSupabaseMode(enabled)
  })

  ipcMain.handle('migration:upload-files', async () => {
    const logs: string[] = []
    await uploadPendingFiles((msg) => { logs.push(msg); console.log(msg) })
    return logs
  })

  ipcMain.handle('migration:get-mode', () => {
    if (supabaseService.isEnabled()) return true
    const use = (queryOne('SELECT value FROM settings WHERE key = ?', ['use_supabase']) as any)?.value
    return use === 'true'
  })

  // -- App --
  ipcMain.handle('app:get-path', () => app.getPath('userData'))
}

function escapeHtml(text: string): string {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function startAutoBackup() {
  setInterval(() => { saveDb() }, 5 * 60 * 1000)
}

app.whenReady().then(async () => {
  registerMediaProtocol()
  registerIpcHandlers()
  await createWindow()
  startAutoBackup()
  app.on('activate', async () => { if (BrowserWindow.getAllWindows().length === 0) await createWindow() })
})

app.on('before-quit', () => { saveDb() })
app.on('window-all-closed', () => { closeDb(); if (process.platform !== 'darwin') app.quit() })
