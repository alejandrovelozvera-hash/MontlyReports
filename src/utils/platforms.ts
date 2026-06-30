export const DEFAULT_PLATFORMS = ['Facebook', 'Instagram', 'TikTok']

export async function loadPlatforms(): Promise<string[]> {
  try {
    const raw = await window.electronAPI.getSetting('platforms')
    const custom: string[] = raw ? JSON.parse(raw) : []
    const merged = [...DEFAULT_PLATFORMS]
    for (const p of custom) {
      if (!merged.includes(p)) merged.push(p)
    }
    return merged
  } catch {
    return [...DEFAULT_PLATFORMS]
  }
}

export async function saveCustomPlatform(name: string): Promise<void> {
  const raw = await window.electronAPI.getSetting('platforms')
  const custom: string[] = raw ? JSON.parse(raw) : []
  if (!custom.includes(name)) {
    custom.push(name)
    await window.electronAPI.setSetting('platforms', JSON.stringify(custom))
  }
}

export async function deleteCustomPlatform(name: string): Promise<void> {
  if (DEFAULT_PLATFORMS.includes(name)) return
  const raw = await window.electronAPI.getSetting('platforms')
  const custom: string[] = raw ? JSON.parse(raw) : []
  const filtered = custom.filter((p) => p !== name)
  await window.electronAPI.setSetting('platforms', JSON.stringify(filtered))
}
