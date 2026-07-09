import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { queryAll } from './db'

let _supabaseUrl = ''
let _supabaseKey = ''

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
}

export function configureSupabase(url: string, anonKey: string) {
  _supabaseUrl = normalizeUrl(url)
  _supabaseKey = anonKey
}

function getSupabase() {
  if (!_supabaseUrl || !_supabaseKey) throw new Error('Supabase no configurado')
  return createClient(_supabaseUrl, _supabaseKey, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket as any },
  })
}

// Direct REST upsert to avoid postgrest-js URL issues
async function restUpsert(table: string, rows: any[], _conflictKey: string, supabaseUrl: string, anonKey: string): Promise<{count: number}> {
  const fullUrl = `${normalizeUrl(supabaseUrl)}/rest/v1/${table}`
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text.substring(0, 300)}`)
  }
  return { count: rows.length }
}

function exportAllTables(baseDir: string): Record<string, any[]> {
  const tables: { name: string; orderBy: string }[] = [
    { name: 'clients', orderBy: 'id' },
    { name: 'designs', orderBy: 'id' },
    { name: 'reports', orderBy: 'id' },
    { name: 'settings', orderBy: 'key' },
    { name: 'design_templates', orderBy: 'id' },
    { name: 'design_tags', orderBy: 'id' },
    { name: 'client_notes', orderBy: 'id' },
    { name: 'monthly_goals', orderBy: 'id' },
    { name: 'products', orderBy: 'id' },
    { name: 'packages', orderBy: 'id' },
    { name: 'package_items', orderBy: 'id' },
  ]
  const data: Record<string, any[]> = {}
  for (const { name, orderBy } of tables) {
    try {
      const rows = queryAll(`SELECT * FROM ${name} ORDER BY ${orderBy}`)
      data[name] = rows
      const fp = path.join(baseDir, `${name}.json`)
      fs.writeFileSync(fp, JSON.stringify(rows, null, 2))
    } catch (e: any) {
      console.warn(`[Migracion] No se pudo exportar ${name}: ${e.message}`)
      data[name] = []
    }
  }
  return data
}

const COLUMN_MAP: Record<string, Record<string, string>> = {
  clients: { logo_path: 'logo_url' },
  designs: { file_path: 'file_url', thumbnail_path: 'thumbnail_url' },
  reports: { file_path: 'file_url' },
}

function mapColumns(table: string, row: any): any {
  const map = COLUMN_MAP[table]
  if (!map) return row
  const out: any = {}
  for (const [k, v] of Object.entries(row)) {
    out[map[k] ?? k] = v
  }
  return out
}

export async function runMigration(onProgress?: (msg: string) => void) {
  const log = (msg: string) => { console.log(`[Migracion] ${msg}`); onProgress?.(msg) }
  const supabase = getSupabase()
  const baseDir = path.join(app.getPath('userData'), 'supabase-export')
  fs.mkdirSync(baseDir, { recursive: true })

  log('Exportando datos locales...')
  const data = exportAllTables(baseDir)

  // Test connection
  log('Probando conexion a Supabase...')
  const testUrl = `${_supabaseUrl}/rest/v1/clients?select=id&limit=1`
  const testRes = await fetch(testUrl, {
    headers: { 'apikey': _supabaseKey, 'Authorization': `Bearer ${_supabaseKey}` }
  })
  if (!testRes.ok) {
    const text = await testRes.text()
    log(`ERROR: GET test fallo (${testRes.status}): ${text.substring(0, 300)}`)
    log('')
    log('Verifica: (1) Que la URL y la anon key sean correctas')
    log('(2) Que el schema.sql se haya ejecutado correctamente en el SQL Editor')
    log('(3) Que no haya RLS bloqueando (ve a Authentication > Policies o deshabilita RLS en cada tabla)')
    throw new Error('Conexion a Supabase fallo. Revisa los detalles arriba.')
  }
  log('Conexion OK')

  const tableConfigs: { name: string; conflictKey: string; order: number }[] = [
    { name: 'clients', conflictKey: 'id', order: 1 },
    { name: 'designs', conflictKey: 'id', order: 2 },
    { name: 'design_tags', conflictKey: 'id', order: 3 },
    { name: 'client_notes', conflictKey: 'id', order: 4 },
    { name: 'monthly_goals', conflictKey: 'id', order: 5 },
    { name: 'products', conflictKey: 'id', order: 6 },
    { name: 'packages', conflictKey: 'id', order: 7 },
    { name: 'package_items', conflictKey: 'id', order: 8 },
    { name: 'reports', conflictKey: 'id', order: 9 },
    { name: 'design_templates', conflictKey: 'id', order: 10 },
    { name: 'settings', conflictKey: 'key', order: 11 },
  ]

  for (const { name, conflictKey } of tableConfigs) {
    const rows = data[name]
    if (!rows || rows.length === 0) { log(`${name}: 0 filas`); continue }

    const mapped = rows.map((r: any) => mapColumns(name, r))

    let inserted = 0
    for (let j = 0; j < mapped.length; j += 20) {
      const batch = mapped[j + 19] ? mapped.slice(j, j + 20) : mapped.slice(j)
      log(`  ${name}: enviando lote ${j/20+1}...`)
      try {
        await restUpsert(name, batch, conflictKey, _supabaseUrl, _supabaseKey)
        inserted += batch.length
      } catch (e: any) {
        log(`  Error en ${name} (lote ${j}): ${e.message}`)
        for (const row of batch) {
          try {
            await restUpsert(name, [row], conflictKey, _supabaseUrl, _supabaseKey)
            inserted++
          } catch {}
        }
      }
    }
    log(`${name}: ${inserted}/${rows.length} filas`)
  }

  log('Datos migrados. Subiendo archivos...')

  // Upload design images
  const userData = app.getPath('userData')
  const designRows = data['designs'] || []
  let imgCount = 0
  for (const d of designRows) {
    if (d.file_path && fs.existsSync(d.file_path)) {
      const ext = path.extname(d.file_path) || '.jpg'
      const dest = `${d.client_id}/${d.id}${ext}`
      const buf = fs.readFileSync(d.file_path)
      const { error } = await supabase.storage.from('designs').upload(dest, buf, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl(dest)
        await supabase.from('designs').update({ file_url: publicUrl }).eq('id', d.id)
        imgCount++
      }
    }
    if (d.thumbnail_path && fs.existsSync(d.thumbnail_path)) {
      const ext = path.extname(d.thumbnail_path) || '.jpg'
      const dest = `${d.client_id}/${d.id}_thumb${ext}`
      const buf = fs.readFileSync(d.thumbnail_path)
      const { error } = await supabase.storage.from('designs').upload(dest, buf, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl(dest)
        await supabase.from('designs').update({ thumbnail_url: publicUrl }).eq('id', d.id)
      }
    }
  }
  log(`${imgCount} imagenes de disenos subidas`)

  // Upload client logos
  let logoCount = 0
  for (const c of data['clients'] || []) {
    if (c.logo_path && fs.existsSync(c.logo_path)) {
      const ext = path.extname(c.logo_path) || '.jpg'
      const dest = `${c.id}/logo${ext}`
      const buf = fs.readFileSync(c.logo_path)
      const { error } = await supabase.storage.from('logos').upload(dest, buf, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(dest)
        await supabase.from('clients').update({ logo_url: publicUrl }).eq('id', c.id)
        logoCount++
      }
    }
  }
  log(`${logoCount} logos de clientes subidos`)

  // Upload company files
  const settings = data['settings'] || []
  const companyLogo = settings.find((s: any) => s.key === 'company_logo_path')
  if (companyLogo?.value && fs.existsSync(companyLogo.value)) {
    const ext = path.extname(companyLogo.value) || '.jpg'
    const buf = fs.readFileSync(companyLogo.value)
    const { error } = await supabase.storage.from('company').upload(`logo${ext}`, buf, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('company').getPublicUrl(`logo${ext}`)
      await supabase.from('settings').upsert({ key: 'company_logo_url', value: publicUrl })
    }
  }

  const template = settings.find((s: any) => s.key === 'proforma_template_path')
  if (template?.value && fs.existsSync(template.value)) {
    const ext = path.extname(template.value) || '.png'
    const buf = fs.readFileSync(template.value)
    const { error } = await supabase.storage.from('templates').upload(`template${ext}`, buf, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('templates').getPublicUrl(`template${ext}`)
      await supabase.from('settings').upsert({ key: 'proforma_template_url', value: publicUrl })
    }
  }

  log('Migracion completada exitosamente.')
  log(`Los datos estan en Supabase. Respaldo local en: ${baseDir}`)
}

export async function uploadPendingFiles(onProgress?: (msg: string) => void) {
  const log = (msg: string) => { console.log(`[Upload] ${msg}`); onProgress?.(msg) }
  const supabase = getSupabase()

  const designs = queryAll('SELECT * FROM designs ORDER BY id')
  const clients = queryAll('SELECT * FROM clients ORDER BY id')

  let uploaded = 0
  let total = 0

  // Primero verificar Storage buckets
  for (const bucket of ['designs', 'logos', 'company']) {
    const { error } = await supabase.storage.getBucket(bucket)
    if (error) {
      log(`ERROR: Bucket '${bucket}' no existe. Créalo en Supabase SQL Editor: SELECT create_storage_bucket('${bucket}')`)
    }
  }

  for (const d of designs) {
    if (d.file_path && fs.existsSync(d.file_path)) {
      total++
      const ext = path.extname(d.file_path) || '.jpg'
      const dest = `${d.client_id}/${d.id}${ext}`
      const buf = fs.readFileSync(d.file_path)
      const { error } = await supabase.storage.from('designs').upload(dest, buf, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl(dest)
        await supabase.from('designs').update({ file_url: publicUrl }).eq('id', d.id)
        uploaded++
        log(`✓ ${d.title}`)
      } else {
        log(`✗ ${d.title}: ${error.message}`)
      }
    }
    if (d.thumbnail_path && fs.existsSync(d.thumbnail_path) && !d.file_url) {
      const ext = path.extname(d.thumbnail_path) || '.jpg'
      const dest = `${d.client_id}/${d.id}_thumb${ext}`
      const buf = fs.readFileSync(d.thumbnail_path)
      const { error } = await supabase.storage.from('designs').upload(dest, buf, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl(dest)
        await supabase.from('designs').update({ thumbnail_url: publicUrl }).eq('id', d.id)
      }
    }
  }

  log(`${uploaded}/${total} imagenes de disenos subidas`)

  let logoCount = 0
  for (const c of clients) {
    if (c.logo_path && fs.existsSync(c.logo_path)) {
      const ext = path.extname(c.logo_path) || '.jpg'
      const dest = `${c.id}/logo${ext}`
      const buf = fs.readFileSync(c.logo_path)
      const { error } = await supabase.storage.from('logos').upload(dest, buf, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(dest)
        await supabase.from('clients').update({ logo_url: publicUrl }).eq('id', c.id)
        logoCount++
        log(`  ✓ Logo ${c.name || c.id}`)
      } else {
        log(`  ✗ Logo ${c.name || c.id}: ${error.message}`)
      }
    }
  }
  log(`${logoCount} logos subidos`)

  log('Completado')
}
