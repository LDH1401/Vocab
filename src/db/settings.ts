import { commit, getData } from './store'
import type { Settings } from './types'
import { normalizeSettings } from './settingsDefaults'

export { DEFAULT_SETTINGS, normalizeSettings } from './settingsDefaults'

export function getSettings(): Settings {
  return getData().settings
}

/** Dùng mạng để bù những ngày quên học, chờ đến khi đã lưu lên server */
export async function restoreStreak(days: string[]): Promise<void> {
  const current = getSettings()
  const next = normalizeSettings({ ...current, streakFreezes: [...current.streakFreezes, ...days] })
  await commit([{ type: 'put', collection: 'settings', docs: [next] }])
}

export function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Settings {
  const next = normalizeSettings({ ...getSettings(), ...patch })
  void commit([{ type: 'put', collection: 'settings', docs: [next] }])
  return next
}
