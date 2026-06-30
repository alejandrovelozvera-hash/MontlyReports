-- Run this in your Supabase project SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  company TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  notes TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Designs
CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  paid INTEGER DEFAULT 0,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  design_date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  favorite INTEGER DEFAULT 0,
  price REAL DEFAULT 0,
  platform TEXT DEFAULT '',
  platform_cost REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_designs_client_id ON designs(client_id);
CREATE INDEX IF NOT EXISTS idx_designs_date ON designs(design_date);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  personal_message TEXT DEFAULT '',
  template_color TEXT DEFAULT '#6366f1',
  file_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Design templates
CREATE TABLE IF NOT EXISTS design_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  price REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design tags
CREATE TABLE IF NOT EXISTS design_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_design_tags_design_id ON design_tags(design_id);

-- Client notes
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);

-- Monthly goals
CREATE TABLE IF NOT EXISTS monthly_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  goal REAL DEFAULT 0,
  UNIQUE(month, year)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  price REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package items
CREATE TABLE IF NOT EXISTS package_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT DEFAULT '',
  quantity INTEGER DEFAULT 1,
  price REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id);
