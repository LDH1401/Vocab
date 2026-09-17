import { useData } from '../db/store'
import type { Settings } from '../db/types'

export function useSettings(): Settings {
  return useData().settings
}
