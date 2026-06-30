import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

let db: SqlJsDatabase | null = null
let dbPath: string = ''

export async function getDb(): Promise<SqlJsDatabase> {
  if (!db) {
    const SQL = await initSqlJs()
    dbPath = path.join(app.getPath('userData'), 'design-reports.db')

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    initializeSchema()
    saveDb()
  }
  return db
}

function initializeSchema() {
  if (!db) return
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      company TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      notes TEXT DEFAULT '',
      logo_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      paid INTEGER DEFAULT 0,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT DEFAULT '',
      design_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      personal_message TEXT DEFAULT '',
      template_color TEXT DEFAULT '#6366f1',
      file_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Migrations
  try { db.run("ALTER TABLE clients ADD COLUMN logo_path TEXT DEFAULT ''") } catch {}
  try { db.run("ALTER TABLE designs ADD COLUMN category TEXT DEFAULT ''") } catch {}
  try { db.run("ALTER TABLE designs ADD COLUMN sort_order INTEGER DEFAULT 0") } catch {}
try { db.run("ALTER TABLE designs ADD COLUMN paid INTEGER DEFAULT 0") } catch {}
  try { db.run("ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active'") } catch {}
  try { db.run(`CREATE TABLE IF NOT EXISTS design_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT '', price REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now','localtime')))`) } catch {}
  try { db.run(`CREATE TABLE IF NOT EXISTS design_tags (id TEXT PRIMARY KEY, design_id TEXT NOT NULL, tag TEXT NOT NULL, FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE)`) } catch {}
  try { db.run(`CREATE TABLE IF NOT EXISTS client_notes (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE)`) } catch {}
  try { db.run(`CREATE TABLE IF NOT EXISTS monthly_goals (id TEXT PRIMARY KEY, month INTEGER NOT NULL, year INTEGER NOT NULL, goal REAL DEFAULT 0, UNIQUE(month, year))`) } catch {}
  try { db.run("ALTER TABLE designs ADD COLUMN notes TEXT DEFAULT ''") } catch {}
  try { db.run("ALTER TABLE designs ADD COLUMN favorite INTEGER DEFAULT 0") } catch {}
  try { db.run("ALTER TABLE designs ADD COLUMN price REAL DEFAULT 0") } catch {}
  try { db.run("ALTER TABLE designs ADD COLUMN platform TEXT DEFAULT ''") } catch {}
  try { db.run("ALTER TABLE designs ADD COLUMN platform_cost REAL DEFAULT 0") } catch {}
  try { db.run("ALTER TABLE reports ADD COLUMN personal_message TEXT DEFAULT ''") } catch {}
  try { db.run("ALTER TABLE reports ADD COLUMN template_color TEXT DEFAULT '#6366f1'") } catch {}
  try { db.run(`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    price REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`) } catch {}
  try { db.run(`CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`) } catch {}
  try { db.run(`CREATE TABLE IF NOT EXISTS package_items (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT '',
    quantity INTEGER DEFAULT 1,
    price REAL DEFAULT 0,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
  )`) } catch {}
}

export function saveDb() {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

function queryAll(sql: string, params?: any[]): any[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function queryOne(sql: string, params?: any[]): any | null {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

function execute(sql: string, params?: any[]): void {
  if (!db) throw new Error('Database not initialized')
  db.run(sql, params)
  saveDb()
}

export { queryAll, queryOne, execute }

export function closeDb() {
  if (db) {
    saveDb()
    db.close()
    db = null
  }
}
