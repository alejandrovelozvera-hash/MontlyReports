export const DEFAULT_CATEGORIES = ['Logo', 'Web', 'Redes', 'Packaging', 'Branding', 'Otro']
const STORAGE_KEY = 'design_categories'

export async function loadCategories(): Promise<string[]> {
  try {
    const raw = await window.electronAPI.getSetting(STORAGE_KEY)
    const custom: string[] = raw ? JSON.parse(raw) : []
    const merged = [...DEFAULT_CATEGORIES]
    for (const c of custom) {
      if (!merged.includes(c)) merged.push(c)
    }
    return merged
  } catch {
    return [...DEFAULT_CATEGORIES]
  }
}

export async function saveCustomCategory(name: string): Promise<void> {
  const raw = await window.electronAPI.getSetting(STORAGE_KEY)
  const custom: string[] = raw ? JSON.parse(raw) : []
  if (!custom.includes(name)) {
    custom.push(name)
    await window.electronAPI.setSetting(STORAGE_KEY, JSON.stringify(custom))
  }
}

export async function deleteCustomCategory(name: string): Promise<void> {
  if (DEFAULT_CATEGORIES.includes(name)) return
  const raw = await window.electronAPI.getSetting(STORAGE_KEY)
  const custom: string[] = raw ? JSON.parse(raw) : []
  const filtered = custom.filter((c) => c !== name)
  await window.electronAPI.setSetting(STORAGE_KEY, JSON.stringify(filtered))
}
