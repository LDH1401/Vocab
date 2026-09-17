import { Eye } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Settings, Word } from '../../db/types'
import { hasModifier, isActivatingControl, isTypingInField, useKeydown } from '../../hooks/useKeydown'
import { pronounce } from '../../lib/speech'
import { Button, Kbd } from '../ui'
import { WordDetails, WordHeading } from '../WordDetails'
import { QuestionCard } from './QuestionCard'
import type { AnswerResult } from './result'

export function FlipQuestion({
  word,
  settings,
  footer,
}: {
  word: Word
  settings: Settings
  footer: (result: AnswerResult) => ReactNode
}) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (settings.autoPlayAudio) void pronounce(word, settings)
  }, [word, settings])

  useKeydown((e) => {
    if (revealed || isTypingInField(e) || isActivatingControl(e) || hasModifier(e)) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setRevealed(true)
    }
  })

  return (
    <div className="space-y-4">
      <QuestionCard prompt="Từ này nghĩa là gì?">
        <WordHeading word={word} settings={settings} />
        {revealed && (
          <div className="mt-7 animate-fade-up border-t border-dashed border-line-strong pt-7">
            <WordDetails word={word} settings={settings} showHeading={false} />
          </div>
        )}
      </QuestionCard>
      {revealed ? (
        footer({ verdict: null, hinted: false })
      ) : (
        <Button variant="primary" size="lg" className="h-13 w-full text-base" onClick={() => setRevealed(true)}>
          <Eye className="size-5" /> Hiện nghĩa <Kbd className="ml-1">Space</Kbd>
        </Button>
      )}
    </div>
  )
}
