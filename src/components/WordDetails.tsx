import { Lightbulb } from 'lucide-react'
import type { Settings, Word } from '../db/types'
import { findClozes } from '../lib/cloze'
import { posInfo } from '../lib/labels'
import { SpeakButton } from './SpeakButton'
import { Badge } from './ui'

/** Câu ví dụ với từ đang học được in đậm */
export function ExampleSentence({ word, example }: { word: Pick<Word, 'term'>; example: string }) {
  const cloze = findClozes(word.term, [example])[0]
  if (!cloze) return <>{example}</>
  return (
    <>
      {cloze.parts.map((part, i) =>
        part.blank ? (
          <strong
            key={i}
            className="font-semibold text-accent-ink underline decoration-accent/40 decoration-2 underline-offset-4"
          >
            {part.text}
          </strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}

export function WordHeading({ word, settings }: { word: Word; settings: Settings }) {
  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      <div className="flex items-center gap-1.5">
        <h2 className="font-display text-4xl leading-tight font-semibold tracking-tight break-words text-ink sm:text-5xl">
          {word.term}
        </h2>
        <SpeakButton text={word.term} audioUrl={word.audioUrl} settings={settings} size="icon" />
      </div>
      {(word.ipa || word.partOfSpeech) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-ink-2">
          {word.ipa && <span className="font-ipa text-base">{word.ipa}</span>}
          {word.partOfSpeech && (
            <span title={posInfo(word.partOfSpeech).label} className="font-display text-base text-muted italic">
              {posInfo(word.partOfSpeech).label.toLowerCase()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Toàn bộ thông tin của từ, hiện sau khi trả lời */
export function WordDetails({
  word,
  settings,
  showHeading = true,
}: {
  word: Word
  settings: Settings
  showHeading?: boolean
}) {
  return (
    <div className="space-y-5">
      {showHeading && <WordHeading word={word} settings={settings} />}

      <div className="rounded-2xl bg-accent-wash px-5 py-4 text-center">
        <p className="text-xl font-semibold text-accent-ink sm:text-2xl">{word.meaning}</p>
        {word.definition && <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{word.definition}</p>}
      </div>

      {word.examples.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Ví dụ</p>
          <ul className="space-y-2">
            {word.examples.map((example, i) => (
              <li key={i} className="flex items-start gap-2 border-l-2 border-accent/35 py-0.5 pl-3">
                <span className="flex-1 font-display text-[17px] leading-relaxed text-ink">
                  <ExampleSentence word={word} example={example} />
                </span>
                <SpeakButton text={example} settings={settings} className="-mt-0.5 text-muted" label="Đọc câu ví dụ" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {word.synonyms.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Đồng nghĩa</span>
          {word.synonyms.map((s) => (
            <Badge key={s} className="text-xs">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {word.note && (
        <p className="flex gap-2.5 rounded-xl border border-warning/25 bg-warning-wash px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line text-ink">
          <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-ink" />
          <span>{word.note}</span>
        </p>
      )}
    </div>
  )
}
