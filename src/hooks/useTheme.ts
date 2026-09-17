import { useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'vocab-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

let pref = readPref()

function applyTheme() {
  const dark = pref === 'dark' || (pref === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0e0d' : '#f6f5f0')
  listeners.forEach((l) => l())
}

media.addEventListener('change', applyTheme)
applyTheme()

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Không lưu được thì chỉ áp dụng cho lần mở này
  }
  applyTheme()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, () => pref)
}

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'))
}
