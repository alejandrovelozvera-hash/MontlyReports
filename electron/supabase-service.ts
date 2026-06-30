import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

let _supabaseUrl = ''
let _supabaseKey = ''
let _client: SupabaseClient | null = null
let _enabled = false

const _fetchWithTimeout: typeof fetch = (url, init) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
}

export function configureSupabase(url: string, anonKey: string) {
  _supabaseUrl = normalizeUrl(url)
  _supabaseKey = anonKey
  _client = null
}

export function setEnabled(v: boolean) {
  _enabled = v
}

export function isEnabled(): boolean {
  return _enabled && !!_supabaseUrl && !!_supabaseKey
}

function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    if (!_supabaseUrl || !_supabaseKey) throw new Error('Supabase no configurado')
    _client = createSupabaseClient(_supabaseUrl, _supabaseKey, {
      auth: { persistSession: false },
      realtime: { transport: WebSocket as any },
      global: { fetch: _fetchWithTimeout },
    })
  }
  return _client
}

async function restUpsert(table: string, rows: any[], _conflictKey: string): Promise<void> {
  const fullUrl = `${normalizeUrl(_supabaseUrl)}/rest/v1/${table}`
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': _supabaseKey,
      'Authorization': `Bearer ${_supabaseKey}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text.substring(0, 300)}`)
  }
}

// Column mapping: SQLite column → Supabase column
const TO_SUPABASE: Record<string, Record<string, string>> = {
  clients: { logo_path: 'logo_url' },
  designs: { file_path: 'file_url', thumbnail_path: 'thumbnail_url', clientId: 'client_id', fileName: 'file_name', designDate: 'design_date' },
  reports: { file_path: 'file_url' },
}
const TO_LOCAL: Record<string, Record<string, string>> = {
  clients: { logo_url: 'logo_path' },
  designs: { file_url: 'file_path', thumbnail_url: 'thumbnail_path' },
  reports: { file_url: 'file_path' },
}

function mapCols(table: string, row: any, map: Record<string, Record<string, string>>): any {
  const m = map[table]
  if (!m) return row
  const out: any = {}
  for (const [k, v] of Object.entries(row)) {
    out[m[k] ?? k] = v
  }
  return out
}

function toLocal(table: string, row: any): any {
  return mapCols(table, row, TO_LOCAL)
}

function toSupabase(table: string, row: any): any {
  return mapCols(table, row, TO_SUPABASE)
}

// ── Clients ──

export async function listClients(): Promise<any[]> {
  const { data, error } = await getSupabaseClient().from('clients').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((r: any) => toLocal('clients', r))
}

export async function getClient(id: string): Promise<any | null> {
  const { data, error } = await getSupabaseClient().from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data ? toLocal('clients', data) : null
}

export async function createClient(data: any): Promise<any> {
  const row = toSupabase('clients', data)
  const { data: result, error } = await getSupabaseClient().from('clients').insert(row).select().single()
  if (error) throw error
  return toLocal('clients', result)
}

export async function updateClient(id: string, data: any): Promise<any> {
  const row = toSupabase('clients', data)
  const { data: result, error } = await getSupabaseClient().from('clients').update(row).eq('id', id).select().single()
  if (error) throw error
  return toLocal('clients', result)
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('clients').delete().eq('id', id)
  if (error) throw error
}

export async function setClientStatus(id: string, status: string): Promise<any> {
  const { data, error } = await getSupabaseClient().from('clients').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return toLocal('clients', data)
}

export async function uploadClientLogo(clientId: string, localPath: string): Promise<any> {
  const fs = await import('fs')
  const path = await import('path')
  const ext = path.extname(localPath) || '.png'
  const dest = `${clientId}/logo${ext}`
  const buf = fs.readFileSync(localPath)
  const { error: uploadError } = await getSupabaseClient().storage.from('logos').upload(dest, buf, { upsert: true })
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = getSupabaseClient().storage.from('logos').getPublicUrl(dest)
  const { data, error } = await getSupabaseClient().from('clients').update({ logo_url: publicUrl }).eq('id', clientId).select().single()
  if (error) throw error
  return toLocal('clients', data)
}

export async function removeClientLogo(clientId: string): Promise<any> {
  const { data, error } = await getSupabaseClient().from('clients').update({ logo_url: '' }).eq('id', clientId).select().single()
  if (error) throw error
  return toLocal('clients', data)
}

// ── Designs ──

export async function listDesigns(clientId: string, month?: number, year?: number): Promise<any[]> {
  let query = getSupabaseClient().from('designs').select('*').eq('client_id', clientId)
  if (month !== undefined && year !== undefined) {
    query = query
      .gte('design_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('design_date', `${year}-${String(month).padStart(2, '0')}-31`)
      .order('sort_order', { ascending: true })
      .order('design_date', { ascending: true })
      .order('created_at', { ascending: true })
  } else {
    query = query
      .order('sort_order', { ascending: true })
      .order('design_date', { ascending: false })
      .order('created_at', { ascending: false })
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((r: any) => toLocal('designs', r))
}

export async function listDesignsByMonth(clientId: string, month: number, year: number): Promise<any[]> {
  return listDesigns(clientId, month, year)
}

export async function getDesign(id: string): Promise<any | null> {
  const { data, error } = await getSupabaseClient().from('designs').select('*').eq('id', id).single()
  if (error) throw error
  return data ? toLocal('designs', data) : null
}

export async function createDesign(data: any): Promise<any> {
  const row = toSupabase('designs', data)
  const { data: result, error } = await getSupabaseClient().from('designs').insert(row).select().single()
  if (error) throw error
  return toLocal('designs', result)
}

export async function updateDesign(id: string, data: any): Promise<any> {
  const row = toSupabase('designs', data)
  const { data: result, error } = await getSupabaseClient().from('designs').update(row).eq('id', id).select().single()
  if (error) throw error
  return toLocal('designs', result)
}

export async function deleteDesign(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('designs').delete().eq('id', id)
  if (error) throw error
}

export async function toggleDesignPaid(id: string): Promise<boolean> {
  const design = await getDesign(id)
  if (!design) throw new Error('Design not found')
  const newPaid = design.paid ? 0 : 1
  await getSupabaseClient().from('designs').update({ paid: newPaid }).eq('id', id)
  return newPaid === 1
}

export async function toggleDesignFavorite(id: string): Promise<any> {
  const design = await getDesign(id)
  if (!design) throw new Error('Design not found')
  const newVal = design.favorite ? 0 : 1
  const { data, error } = await getSupabaseClient().from('designs').update({ favorite: newVal }).eq('id', id).select().single()
  if (error) throw error
  return toLocal('designs', data)
}

export async function batchReorderDesigns(items: { id: string; sort_order: number }[]): Promise<void> {
  const supabase = getSupabaseClient()
  for (const item of items) {
    const { error } = await supabase.from('designs').update({ sort_order: item.sort_order }).eq('id', item.id)
    if (error) throw error
  }
}

export async function searchDesigns(query: string): Promise<any[]> {
  const term = `%${query.trim()}%`
  const { data, error } = await getSupabaseClient()
    .from('designs')
    .select('*, clients!inner(name)')
    .or(`title.ilike.${term},description.ilike.${term},clients.name.ilike.${term}`)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data || []).map((r: any) => ({
    ...toLocal('designs', r),
    client_name: (r as any).clients?.name || '',
  }))
}

// ── Designs by client (for delete cascade) ──

export async function listDesignsByClient(clientId: string): Promise<any[]> {
  const { data, error } = await getSupabaseClient().from('designs').select('*').eq('client_id', clientId)
  if (error) throw error
  return (data || []).map((r: any) => toLocal('designs', r))
}

// ── Reports ──

export async function listReports(clientId: string): Promise<any[]> {
  const { data, error } = await getSupabaseClient()
    .from('reports').select('*').eq('client_id', clientId).order('year', { ascending: false }).order('month', { ascending: false })
  if (error) throw error
  return (data || []).map((r: any) => toLocal('reports', r))
}

export async function createReport(data: any): Promise<any> {
  const row = toSupabase('reports', data)
  const { data: result, error } = await getSupabaseClient().from('reports').insert(row).select().single()
  if (error) throw error
  return toLocal('reports', result)
}

// ── Settings ──

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient().from('settings').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return data ? data.value : null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { error } = await getSupabaseClient().from('settings').upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}

// ── Design Templates ──

export async function listTemplates(): Promise<any[]> {
  const { data, error } = await getSupabaseClient().from('design_templates').select('*').order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createTemplate(data: any): Promise<any> {
  const { data: result, error } = await getSupabaseClient().from('design_templates').insert(data).select().single()
  if (error) throw error
  return result
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('design_templates').delete().eq('id', id)
  if (error) throw error
}

// ── Tags ──

export async function getTags(designId: string): Promise<string[]> {
  const { data, error } = await getSupabaseClient().from('design_tags').select('tag').eq('design_id', designId)
  if (error) throw error
  return (data || []).map((r: any) => r.tag)
}

export async function setTags(designId: string, tags: string[]): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('design_tags').delete().eq('design_id', designId)
  if (tags.length > 0) {
    const rows = tags.map(tag => ({ id: crypto.randomUUID(), design_id: designId, tag }))
    const { error } = await supabase.from('design_tags').insert(rows)
    if (error) throw error
  }
}

export async function getAllTags(): Promise<string[]> {
  const { data, error } = await supabaseQuery('SELECT DISTINCT tag FROM design_tags ORDER BY tag ASC')
  if (error) throw error
  return (data || []).map((r: any) => r.tag)
}

// ── Client Notes ──

export async function listClientNotes(clientId: string): Promise<any[]> {
  const { data, error } = await getSupabaseClient().from('client_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addClientNote(clientId: string, note: string): Promise<any> {
  const { data, error } = await getSupabaseClient().from('client_notes').insert({
    id: crypto.randomUUID(), client_id: clientId, note,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteClientNote(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('client_notes').delete().eq('id', id)
  if (error) throw error
}

// ── Monthly Goals ──

export async function getGoal(month: number, year: number): Promise<any | null> {
  const { data, error } = await getSupabaseClient().from('monthly_goals').select('*').eq('month', month).eq('year', year).maybeSingle()
  if (error) throw error
  return data
}

export async function setGoal(month: number, year: number, goal: number): Promise<any> {
  const { data, error } = await getSupabaseClient().from('monthly_goals').upsert(
    { id: crypto.randomUUID(), month, year, goal },
    { onConflict: 'month,year' },
  ).select().single()
  if (error) throw error
  return data
}

// ── Products ──

export async function listProducts(): Promise<any[]> {
  const { data, error } = await getSupabaseClient().from('products').select('*').order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createProduct(data: any): Promise<any> {
  const { data: result, error } = await getSupabaseClient().from('products').insert({ ...data, id: crypto.randomUUID() }).select().single()
  if (error) throw error
  return result
}

export async function updateProduct(id: string, data: any): Promise<any> {
  const { data: result, error } = await getSupabaseClient().from('products').update(data).eq('id', id).select().single()
  if (error) throw error
  return result
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('products').delete().eq('id', id)
  if (error) throw error
}

// ── Packages ──

export async function listPackages(): Promise<any[]> {
  const supabase = getSupabaseClient()
  const { data: pkgs, error } = await supabase.from('packages').select('*').order('name', { ascending: true })
  if (error) throw error
  const result = []
  for (const pkg of pkgs || []) {
    const { data: items } = await supabase.from('package_items').select('*').eq('package_id', pkg.id).order('id', { ascending: true })
    result.push({ ...pkg, items: items || [] })
  }
  return result
}

export async function createPackage(data: { name: string; description: string; items: any[] }): Promise<any> {
  const supabase = getSupabaseClient()
  const pkgId = crypto.randomUUID()
  const { data: pkg, error: pkgErr } = await supabase.from('packages').insert({ id: pkgId, name: data.name, description: data.description || '' }).select().single()
  if (pkgErr) throw pkgErr
  for (const item of data.items || []) {
    const { error: itemErr } = await supabase.from('package_items').insert({
      id: crypto.randomUUID(), package_id: pkgId,
      description: item.description, category: item.category || '',
      quantity: item.quantity || 1, price: item.price || 0,
    })
    if (itemErr) throw itemErr
  }
  return pkg
}

export async function updatePackage(id: string, data: { name?: string; description?: string; items?: any[] }): Promise<any> {
  const supabase = getSupabaseClient()
  const updates: any = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('packages').update(updates).eq('id', id)
    if (error) throw error
  }
  if (data.items !== undefined) {
    await supabase.from('package_items').delete().eq('package_id', id)
    for (const item of data.items) {
      const { error } = await supabase.from('package_items').insert({
        id: crypto.randomUUID(), package_id: id,
        description: item.description, category: item.category || '',
        quantity: item.quantity || 1, price: item.price || 0,
      })
      if (error) throw error
    }
  }
  const { data: result } = await supabase.from('packages').select('*').eq('id', id).single()
  return result
}

export async function deletePackage(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('packages').delete().eq('id', id)
  if (error) throw error
}

// ── Reports by client (for delete cascade) ──

export async function listReportsByClient(clientId: string): Promise<any[]> {
  const { data, error } = await getSupabaseClient().from('reports').select('*').eq('client_id', clientId)
  if (error) throw error
  return (data || []).map((r: any) => toLocal('reports', r))
}

// ── Raw query for read-only SQL (used by getAllTags and similar) ──

async function supabaseQuery(sql: string): Promise<{ data: any[] | null; error: any }> {
  try {
    const res = await fetch(`${normalizeUrl(_supabaseUrl)}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': _supabaseKey,
        'Authorization': `Bearer ${_supabaseKey}`,
      },
      body: JSON.stringify({ query: sql }),
    })
    if (!res.ok) throw new Error(`Query failed: ${await res.text()}`)
    const data = await res.json()
    return { data, error: null }
  } catch (e) {
    return { data: null, error: e }
  }
}

// ── Test connection ──

export async function testConnection(): Promise<boolean> {
  const testUrl = `${normalizeUrl(_supabaseUrl)}/rest/v1/clients?select=id&limit=1`
  const res = await fetch(testUrl, {
    headers: { 'apikey': _supabaseKey, 'Authorization': `Bearer ${_supabaseKey}` },
  })
  return res.ok
}

// ── Storage upload ──

export async function uploadFile(bucket: string, destPath: string, localPath: string, timeoutMs = 15000): Promise<string> {
  const fs = await import('fs')
  const buf = fs.readFileSync(localPath)
  const result = await Promise.race([
    getSupabaseClient().storage.from(bucket).upload(destPath, buf, { upsert: true }),
    new Promise<{error: any}>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
  ]) as any
  if (result.error) throw result.error
  const { data: { publicUrl } } = getSupabaseClient().storage.from(bucket).getPublicUrl(destPath)
  return publicUrl
}
