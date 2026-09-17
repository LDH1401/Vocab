import { Lightbulb, Snail, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Settings, Word } from '../../db/types'
import {
  acceptedAnswers,
  checkAnswer,
  closestAnswer,
  hintMask,
  letterCount,
  normalizeAnswer,
  primaryAnswer,
  type Verdict,
} from '../../lib/answer'
import { findClozes, maskTerm } from '../../lib/cloze'
import { posInfo } from '../../lib/labels'
import { pronounce } from '../../lib/speech'
import { buttonClass } from '../styles'
import { Button, Input } from '../ui'
import { WordDetails } from '../WordDetails'
import { AnswerFeedback } from './AnswerFeedback'
import { QuestionCard } from './QuestionCard'
import type { AnswerResult } from './result'

export type TypingVariant = 'spelling' | 'dictation' | 'cloze'

const PROMPTS: Record<TypingVariant, string> = {
  spelling: 'Gõ từ tiếng Anh có nghĩa',
  dictation: 'Nghe và gõ lại từ',
  cloze: 'Điền từ còn thiếu',
}

export function TypingQuestion({
  word,
  variant: requested,
  settings,
  footer,
}: {
  word: Word
  variant: TypingVariant
  settings: Settings
  footer: (result: AnswerResult) => ReactNode
}) {
  // Chọn ngẫu nhiên một câu ví dụ có chứa từ; không còn câu phù hợp thì chuyển sang gõ từ theo nghĩa
  const [cloze] = useState(() => {
    if (requested !== 'cloze') return null
    const all = findClozes(word.term, word.examples)
    return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null
  })
  const variant: TypingVariant = requested === 'cloze' && !cloze ? 'spelling' : requested

  const answer = cloze ? cloze.parts.find((p) => p.blank)!.text : primaryAnswer(word.term)
  const accepted = useMemo(
    () => [...new Set([...(cloze?.answers ?? []), ...acceptedAnswers(word.term)])],
    [cloze, word.term],
  )

  const [input, setInput] = useState('')
  const [hints, setHints] = useState(0)
  const [result, setResult] = useState<{ verdict: Verdict; typed: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (variant === 'dictation') void pronounce(word, settings)
  }, [variant, word, settings])

  const play = (slow = false) => {
    void pronounce(word, settings, slow)
    inputRef.current?.focus()
  }

  const submit = (giveUp: boolean) => {
    if (result) return
    const typed = giveUp ? '' : input
    setResult({ verdict: giveUp ? 'wrong' : checkAnswer(typed, accepted), typed })
    inputRef.current?.blur()
    if (settings.autoPlayAudio) void pronounce(word, settings)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (result) return
    if (input.trim() === '') {
      if (variant === 'dictation') play()
      return
    }
    submit(false)
  }

  const typedForm = result ? normalizeAnswer(result.typed) : ''
  const formNote =
    result && cloze && result.verdict === 'correct' && !cloze.answers.includes(typedForm)
      ? `Trong câu này từ được dùng ở dạng "${answer}".`
      : undefined

  return (
    <div className="space-y-4">
      <QuestionCard prompt={PROMPTS[variant]}>
        <div className="flex flex-col items-center gap-3 text-center">
          {variant === 'spelling' && (
            <>
              <p className="text-2xl leading-snug font-semibold text-ink sm:text-3xl">{word.meaning}</p>
              {word.partOfSpeech && (
                <span className="font-display text-base text-muted italic">
                  {posInfo(word.partOfSpeech).label.toLowerCase()}
                </span>
              )}
              {word.definition && (
                <p className="max-w-md text-sm leading-relaxed text-ink-2">{maskTerm(word.definition, word.term)}</p>
              )}
            </>
          )}
          {variant === 'dictation' && (
            <div className="flex items-center gap-4 py-2">
              <span className="relative">
                <span aria-hidden className="absolute -inset-2.5 rounded-full bg-accent-wash" />
                <button
                  type="button"
                  onClick={() => play()}
                  aria-label="Nghe lại"
                  className={buttonClass('primary', 'icon', 'relative size-18 rounded-full')}
                >
                  <Volume2 className="size-8" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => play(true)}
                aria-label="Nghe chậm"
                title="Nghe chậm"
                className={buttonClass('secondary', 'icon', 'size-11 rounded-full')}
              >
                <Snail className="size-5" />
              </button>
            </div>
          )}
          {variant === 'cloze' && cloze && (
            <>
              <p className="font-display text-2xl leading-relaxed text-ink">
                {cloze.parts.map((part, i) =>
                  part.blank ? (
                    <span key={i} className="mx-0.5 inline-block min-w-20 rounded-t-md border-b-2 border-accent bg-accent-wash px-1.5 font-semibold text-accent-ink">
                      {result ? part.text : '\u00a0'}
                    </span>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </p>
              <p className="text-sm text-ink-2">
                Nghĩa: <span className="font-medium text-ink">{word.meaning}</span>
              </p>
            </>
          )}
          {!result && (
            <p
              className="mt-2 rounded-xl bg-surface-2 px-4 py-2 font-mono text-lg tracking-[0.3em] text-ink-2"
              aria-label={`${letterCount(answer)} chữ cái`}
            >
              {hintMask(answer, hints)}
            </p>
          )}
        </div>
      </QuestionCard>

      {!result ? (
        <form onSubmit={onSubmit} className="animate-fade-up space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="Gõ câu trả lời…"
              aria-label="Câu trả lời"
              className="h-13 px-4 text-lg"
            />
            <Button type="submit" variant="primary" size="lg" className="h-13">
              Kiểm tra
            </Button>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={hints >= letterCount(answer) - 1}
              onClick={() => {
                setHints((h) => h + 1)
                inputRef.current?.focus()
              }}
            >
              <Lightbulb className="size-4" /> Gợi ý chữ cái
            </Button>
            <Button size="sm" variant="ghost" onClick={() => submit(true)}>
              Không nhớ
            </Button>
          </div>
        </form>
      ) : (
        <>
          <AnswerFeedback
            verdict={result.verdict}
            typed={result.typed}
            expected={result.typed ? closestAnswer(result.typed, accepted) : answer}
            note={formNote}
          />
          <section className="animate-fade-up rounded-3xl border border-line bg-surface px-5 py-6 shadow-card sm:px-7">
            <WordDetails word={word} settings={settings} />
          </section>
          {footer({ verdict: result.verdict, hinted: hints > 0 })}
        </>
      )}
    </div>
  )
}
