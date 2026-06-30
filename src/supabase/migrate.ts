import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { queryAll, queryOne } from '../../electron/db'
import { getSupabase } from './client'

interface ExportData {
  clients: any[]
  designs: any[]
  reports: any[]
  settings: any[]
  design_templates: any[]
  design_tags: any[]
  client_notes: any[]
  monthly_goals: any[]
  products: any[]
  packages: any[]
  package_items: any[]
}

export function exportLocalData(exportDir: string): ExportData {
  const tables = [
    'clients', 'designs', 'reports', 'settings',
    'design_templates', 'design_tags', 'client_notes',
    'monthly_goals', 'products', 'packages', 'package_items',
  ] as const

  const data: any = {}
  for (const table of tables) {
    const rows = queryAll(`SELECT * FROM ${table} ORDER BY id`)
    data[table] = rows
    const filePath = path.join(exportDir, `${table}.json`)
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2))
    console.log(`Exported ${rows.length} rows from ${table}`)
  }

  return data as ExportData
}

export async function migrateToSupabase(exportDir: string, onProgress?: (msg: string) => void) {
  const supabase = getSupabase()
  const log = (msg: string) => { console.log(msg); onProgress?.(msg) }

  // 1. Export local data
  log('Exportando datos locales...')
  const data = exportLocalData(exportDir)

  // 2. Import each table
  const tables = [
    { name: 'clients', key: 'id' },
    { name: 'designs', key: 'id' },
    { name: 'reports', key: 'id' },
    { name: 'settings', key: 'key' },
    { name: 'design_templates', key: 'id' },
    { name: 'design_tags', key: 'id' },
    { name: 'client_notes', key: 'id' },
    { name: 'monthly_goals', key: 'id' },
    { name: 'products', key: 'id' },
    { name: 'packages', key: 'id' },
    { name: 'package_items', key: 'id' },
  ] as const

  const totalTables = tables.length

  for (let i = 0; i < tables.length; i++) {
    const { name, key } = tables[i]
    const rows = (data as any)[name] || []

    if (rows.length === 0) {
      log(`[${i+1}/${totalTables}] ${name}: 0 filas (saltando)`)
      continue
    }

    // Insert in batches of 50
    const batchSize = 50
    let inserted = 0
    for (let j = 0; j < rows.length; j += batchSize) {
      const batch = rows.slice(j, j + batchSize)
      const { error } = await supabase.from(name).upsert(batch, { onConflict: key })
      if (error) {
        // Try inserting one by one if upsert fails (e.g., UUID format issues)
        for (const row of batch) {
          const { error: insertErr } = await supabase.from(name).insert(row)
          if (insertErr) log(`  Error en ${name}: ${insertErr.message}`)
          else inserted++
        }
      } else {
        inserted += batch.length
      }
    }
    log(`[${i+1}/${totalTables}] ${name}: ${inserted}/${rows.length} filas importadas`)
  }

  log('Migración de datos completada.')

  // 3. Upload images to Storage
  await migrateImages(supabase, data, exportDir, log)
}

async function migrateImages(supabase: ReturnType<typeof getSupabase>, data: ExportData, exportDir: string, log: (msg: string) => void) {
  const userData = app.getPath('userData')
  const storageBuckets = ['designs', 'logos', 'company', 'templates']

  // Ensure buckets exist
  for (const bucket of storageBuckets) {
    const { data: existing } = await supabase.storage.getBucket(bucket)
    if (!existing) {
      await supabase.storage.createBucket(bucket, { public: true })
      log(`Bucket "${bucket}" creado`)
    }
  }

  // Upload design images
  log('Subiendo imágenes de diseños...')
  let uploaded = 0
  for (const d of data.designs) {
    const filePath = d.file_path
    if (filePath && fs.existsSync(filePath)) {
      const ext = path.extname(filePath) || '.jpg'
      const destPath = `${d.client_id}/${d.id}${ext}`
      const buffer = fs.readFileSync(filePath)
      const { error } = await supabase.storage.from('designs').upload(destPath, buffer, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl(destPath)
        await supabase.from('designs').update({ file_url: publicUrl }).eq('id', d.id)
        uploaded++
      }
    }
    // Upload thumbnail
    const thumbPath = d.thumbnail_path
    if (thumbPath && fs.existsSync(thumbPath)) {
      const ext = path.extname(thumbPath) || '.jpg'
      const destPath = `${d.client_id}/${d.id}_thumb${ext}`
      const buffer = fs.readFileSync(thumbPath)
      const { error } = await supabase.storage.from('designs').upload(destPath, buffer, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl(destPath)
        await supabase.from('designs').update({ thumbnail_url: publicUrl }).eq('id', d.id)
      }
    }
  }
  log(`${uploaded}/${data.designs.filter((d: any) => d.file_path).length} imágenes de diseños subidas`)

  // Upload client logos
  log('Subiendo logos de clientes...')
  for (const c of data.clients) {
    if (c.logo_path && fs.existsSync(c.logo_path)) {
      const ext = path.extname(c.logo_path) || '.jpg'
      const destPath = `${c.id}/logo${ext}`
      const buffer = fs.readFileSync(c.logo_path)
      const { error } = await supabase.storage.from('logos').upload(destPath, buffer, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(destPath)
        await supabase.from('clients').update({ logo_url: publicUrl }).eq('id', c.id)
      }
    }
  }

  // Upload company logo & template
  const settingsData = data.settings
  const companyLogoSetting = settingsData.find((s: any) => s.key === 'company_logo_path')
  if (companyLogoSetting?.value && fs.existsSync(companyLogoSetting.value)) {
    const buffer = fs.readFileSync(companyLogoSetting.value)
    const ext = path.extname(companyLogoSetting.value) || '.jpg'
    const destPath = `company/logo${ext}`
    const { error } = await supabase.storage.from('company').upload(destPath, buffer, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('company').getPublicUrl(destPath)
      await supabase.from('settings').upsert({ key: 'company_logo_url', value: publicUrl })
    }
  }

  const templateSetting = settingsData.find((s: any) => s.key === 'proforma_template_path')
  if (templateSetting?.value && fs.existsSync(templateSetting.value)) {
    const buffer = fs.readFileSync(templateSetting.value)
    const ext = path.extname(templateSetting.value) || '.png'
    const destPath = `company/template${ext}`
    const { error } = await supabase.storage.from('templates').upload(destPath, buffer, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('templates').getPublicUrl(destPath)
      await supabase.from('settings').upsert({ key: 'proforma_template_url', value: publicUrl })
    }
  }

  log('Migración de imágenes completada.')
  log('¡Migración a Supabase finalizada!')
}
