import type { Settings, Word } from '../db/types'
import { MINUTE } from './date'

export type SpeechOptions = Pick<Settings, 'accent' | 'voiceURI' | 'speechRate' | 'preferRecordedAudio'>

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

const normLang = (lang: string) => lang.replace('_', '-').toLowerCase()

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return speechSynthesis.getVoices().filter((v) => normLang(v.lang).startsWith('en'))
}

function pickVoice(opts: SpeechOptions): SpeechSynthesisVoice | undefined {
  const voices = englishVoices()
  const accent = opts.accent.toLowerCase()
  return (
    voices.find((v) => v.voiceURI === opts.voiceURI) ??
    voices.find((v) => normLang(v.lang) === accent) ??
    voices[0]
  )
}

let currentAudio: HTMLAudioElement | null = null
let playToken = 0

function stopAll() {
  playToken++
  currentAudio?.pause()
  currentAudio = null
  if (speechSupported) speechSynthesis.cancel()
}

export function speak(text: string, opts: SpeechOptions, slow = false) {
  stopAll()
  if (!speechSupported || !text.trim()) return
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(opts)
  if (voice) u.voice = voice
  u.lang = opts.accent
  u.rate = opts.speechRate * (slow ? 0.65 : 1)
  speechSynthesis.speak(u)
}

// File ghi âm của Free Dictionary API đôi khi rất chậm hoặc lỗi.
// Nếu không phát được trong 2,5 giây thì chuyển sang giọng đọc của trình duyệt,
// và tạm bỏ qua file ghi âm vài phút để không phải chờ lại mỗi lần.
const START_TIMEOUT_MS = 2500
let recordedBlockedUntil = 0
const brokenUrls = new Set<string>()

function playRecorded(url: string, slow: boolean, token: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.defaultPlaybackRate = audio.playbackRate = slow ? 0.7 : 1
    currentAudio = audio
    const fail = (reason: 'timeout' | 'error') => {
      clearTimeout(timer)
      audio.pause()
      if (currentAudio === audio) currentAudio = null
      reject(new Error(reason))
    }
    const timer = setTimeout(() => fail('timeout'), START_TIMEOUT_MS)
    audio.addEventListener(
      'playing',
      () => {
        clearTimeout(timer)
        if (token !== playToken) audio.pause()
        resolve()
      },
      { once: true },
    )
    audio.addEventListener('error', () => fail('error'), { once: true })
    audio.play().catch(() => fail('error'))
  })
}

/** Phát âm một từ: ưu tiên file ghi âm từ điển (nếu bật), lỗi thì dùng giọng đọc máy */
export async function pronounce(word: Pick<Word, 'term' | 'audioUrl'>, opts: SpeechOptions, slow = false) {
  stopAll()
  const token = playToken
  const url = word.audioUrl
  if (opts.preferRecordedAudio && url && !brokenUrls.has(url) && Date.now() > recordedBlockedUntil) {
    try {
      await playRecorded(url, slow, token)
      return
    } catch (e) {
      if ((e as Error).message === 'timeout') recordedBlockedUntil = Date.now() + 5 * MINUTE
      else brokenUrls.add(url)
      if (token !== playToken) return
    }
  }
  speak(word.term, opts, slow)
}
