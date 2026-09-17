import { useEffect, useState } from 'react'
import { englishVoices, speechSupported } from '../lib/speech'

/** Danh sách giọng tiếng Anh; trình duyệt nạp giọng bất đồng bộ nên cần nghe sự kiện voiceschanged */
export function useEnglishVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState(englishVoices)
  useEffect(() => {
    if (!speechSupported) return
    const update = () => setVoices(englishVoices())
    speechSynthesis.addEventListener('voiceschanged', update)
    update()
    return () => speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  return voices
}
