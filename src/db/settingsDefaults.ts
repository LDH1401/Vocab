import { CARD_TYPES, type Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  enabledCardTypes: ['meaning', 'spelling', 'cloze'],
  newCardsPerDay: 20,
  requestRetention: 0.9,
  meaningDisplay: 'flip',
  accent: 'en-US',
  voiceURI: '',
  speechRate: 0.9,
  preferRecordedAudio: true,
  autoPlayAudio: true,
}

export function normalizeSettings(stored: Partial<Settings> | undefined | null): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...stored, id: 'app' as const }
  const types = merged.enabledCardTypes.filter((t) => CARD_TYPES.includes(t))
  return { ...merged, enabledCardTypes: types.length > 0 ? types : DEFAULT_SETTINGS.enabledCardTypes }
}
