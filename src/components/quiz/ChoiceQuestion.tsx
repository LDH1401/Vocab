import { CircleCheck, CircleX } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Settings, Word } from '../../db/types'
import { hasModifier, isTypingInField, useKeydown } from '../../hooks/useKeydown'
import { buildChoices } from '../../lib/choices'
import { cn } from '../../lib/cn'
import { pronounce } from '../../lib/speech'
import { WordDetails, WordHeading } from '../WordDetails'
import { QuestionCard } from './QuestionCard'
import type { AnswerResult } from './result'

export function ChoiceQuestion({
  word,
  pool,
  settings,
  footer,
}: {
  word: Word
  pool: Word[]
  settings: Settings
  footer: (result: AnswerResult) => ReactNode
}) {
  const [options] = useState(() => buildChoices(word, pool))
  const [picked, setPicked] = useState<string | null>(null)
  const answered = picked !== null

  useEffect(() => {
    if (settings.autoPlayAudio) void pronounce(word, settings)
  }, [word, settings])

  useKeydown((e) => {
    if (answered || isTypingInField(e) || hasModifier(e)) return
    const index = Number(e.key) - 1
    if (Number.isInteger(index) && index >= 0 && index < options.length) {
      e.preventDefault()
      setPicked(options[index].id)
    }
  })

  return (
    <div className="space-y-4">
      <QuestionCard prompt="Chọn nghĩa chính xác">
        <WordHeading word={word} settings={settings} />
      </QuestionCard>

      <div className="grid gap-2.5" role="group" aria-label="Các đáp án">
        {options.map((option, i) => {
          const isAnswer = option.id === word.id
          const isPicked = option.id === picked
          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              onClick={() => setPicked(option.id)}
              style={{ animationDelay: `${60 + i * 40}ms` }}
              className={cn(
                'group flex min-h-15 w-full animate-fade-up items-center gap-3.5 rounded-2xl border px-4 py-3 text-left shadow-card transition-all duration-150',
                !answered && 'border-line bg-surface hover:-translate-y-px hover:border-accent/50 hover:shadow-float active:translate-y-0',
                answered && isAnswer && 'border-good/60 bg-good-wash ring-4 ring-good/15',
                answered && isPicked && !isAnswer && 'border-critical/60 bg-critical-wash ring-4 ring-critical/15',
                answered && !isAnswer && !isPicked && 'border-line bg-surface opacity-50',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                  answered && isAnswer
                    ? 'bg-good text-white dark:text-[#04241a]'
                    : answered && isPicked && !isAnswer
                      ? 'bg-critical text-white dark:text-[#2a0708]'
                      : 'border border-line bg-surface-2 text-ink-2 group-hover:border-accent/40 group-hover:text-accent-ink',
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-[15px] font-medium text-ink sm:text-base">{option.meaning}</span>
              {answered && isAnswer && (
                <CircleCheck aria-label="Đáp án đúng" className="size-5 shrink-0 animate-pop text-good-ink" />
              )}
              {answered && isPicked && !isAnswer && (
                <CircleX aria-label="Bạn chọn sai" className="size-5 shrink-0 animate-pop text-critical-ink" />
              )}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="space-y-4 pt-1">
          {(word.examples.length > 0 || word.definition || word.note) && (
            <section className="animate-fade-up rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-7">
              <WordDetails word={word} settings={settings} showHeading={false} />
            </section>
          )}
          {footer({ verdict: picked === word.id ? 'correct' : 'wrong', hinted: false })}
        </div>
      )}
    </div>
  )
}
