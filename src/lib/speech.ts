import { ACCENTS, type Accent, type AccentPref, type Settings, type Word } from '../db/types'
import { MINUTE } from './date'

export type SpeechOptions = Pick<Settings, 'accent' | 'voiceURI' | 'speechRate' | 'preferRecordedAudio'>

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

const normLang = (lang: string) => lang.replace('_', '-').toLowerCase()

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return speechSynthesis.getVoices().filter((v) => normLang(v.lang).startsWith('en'))
}

/** Chế độ ngẫu nhiên: mỗi lần chọn một trong 4 giọng như đề TOEIC */
export function resolveAccent(pref: AccentPref): Accent {
  return pref === 'mixed' ? ACCENTS[Math.floor(Math.random() * ACCENTS.length)] : pref
}

export function hasVoiceFor(accent: Accent): boolean {
  return englishVoices().some((v) => normLang(v.lang) === accent.toLowerCase())
}

// Thiết bị không có giọng máy đúng chất giọng thì dùng giọng gần nhất
const VOICE_FALLBACK: Record<Accent, Accent[]> = {
  'en-US': ['en-US', 'en-CA'],
  'en-GB': ['en-GB', 'en-AU'],
  'en-AU': ['en-AU', 'en-GB'],
  'en-CA': ['en-CA', 'en-US'],
}

function pickVoice(accent: Accent, voiceURI: string): SpeechSynthesisVoice | undefined {
  const voices = englishVoices()
  // Giọng người dùng tự chọn chỉ được dùng khi khớp chất giọng đang phát
  const chosen = voices.find((v) => v.voiceURI === voiceURI)
  if (chosen && normLang(chosen.lang) === accent.toLowerCase()) return chosen
  for (const lang of VOICE_FALLBACK[accent]) {
    const voice = voices.find((v) => normLang(v.lang) === lang.toLowerCase())
    if (voice) return voice
  }
  return chosen ?? voices[0]
}

/**
 * File ghi âm của từ điển có dạng ...-us.mp3 / -uk.mp3 / -au.mp3. Đổi đuôi để lấy đúng giọng cần phát;
 * file không tồn tại thì pronounce() tự chuyển sang giọng máy. Giọng Canada không có file ghi âm:
 * dùng giọng máy Canada nếu thiết bị có, không thì dùng bản ghi âm giọng Mỹ (gần nhất).
 * Trả về null khi nên đọc bằng giọng máy.
 */
function recordingFor(url: string, accent: Accent): string | null {
  const pattern = /-(us|uk|au)\.mp3$/i
  if (!pattern.test(url)) return url
  const suffix = { 'en-US': 'us', 'en-GB': 'uk', 'en-AU': 'au', 'en-CA': hasVoiceFor('en-CA') ? null : 'us' }[accent]
  return suffix ? url.replace(pattern, `-${suffix}.mp3`) : null
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
  speakNow(text, opts, resolveAccent(opts.accent), slow)
}

function speakNow(text: string, opts: SpeechOptions, accent: Accent, slow: boolean) {
  if (!speechSupported || !text.trim()) return
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(accent, opts.voiceURI)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? accent
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
  const accent = resolveAccent(opts.accent)
  const url = word.audioUrl ? recordingFor(word.audioUrl, accent) : null
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
  speakNow(word.term, opts, accent, slow)
}
