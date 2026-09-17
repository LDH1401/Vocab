import { commit, getData } from './store'
import type { Settings } from './types'
import { normalizeSettings } from './settingsDefaults'

export { DEFAULT_SETTINGS, normalizeSettings } from './settingsDefaults'

export function getSettings(): Settings {
  return getData().settings
}

export function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Settings {
  const next = normalizeSettings({ ...getSettings(), ...patch })
  void commit([{ type: 'put', collection: 'settings', docs: [next] }])
  return next
}
