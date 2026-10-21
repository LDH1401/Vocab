import { ACCENTS, CARD_TYPES, type AccentPref, type Settings } from './types'

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
  streakFreezes: [],
  streakFreezeUsedOn: {},
}

export function normalizeSettings(stored: Partial<Settings> | undefined | null): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...stored, id: 'app' as const }
  const types = merged.enabledCardTypes.filter((t) => CARD_TYPES.includes(t))
  const freezes = Array.isArray(merged.streakFreezes)
    ? [...new Set(merged.streakFreezes.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
    : []
  const isDay = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
  const usedOn: Record<string, string> = {}
  if (merged.streakFreezeUsedOn && typeof merged.streakFreezeUsedOn === 'object') {
    for (const [day, when] of Object.entries(merged.streakFreezeUsedOn)) {
      if (isDay(day) && isDay(when) && freezes.includes(day)) usedOn[day] = when
    }
  }
  const accents: readonly AccentPref[] = [...ACCENTS, 'mixed']
  return {
    ...merged,
    accent: accents.includes(merged.accent) ? merged.accent : DEFAULT_SETTINGS.accent,
    enabledCardTypes: types.length > 0 ? types : DEFAULT_SETTINGS.enabledCardTypes,
    streakFreezes: freezes,
    streakFreezeUsedOn: usedOn,
  }
}
