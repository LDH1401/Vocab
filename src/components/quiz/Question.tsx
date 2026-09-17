import { useState, type ReactNode } from 'react'
import type { PracticeMode, Settings, Word } from '../../db/types'
import { canBuildChoices } from '../../lib/choices'
import { ChoiceQuestion } from './ChoiceQuestion'
import { FlipQuestion } from './FlipQuestion'
import type { AnswerResult } from './result'
import { TypingQuestion } from './TypingQuestion'

/** Hiện một câu hỏi theo kiểu ôn. Dùng key khác nhau cho mỗi lượt để làm mới trạng thái. */
export function Question({
  mode,
  word,
  pool,
  settings,
  footer,
}: {
  mode: PracticeMode | 'meaning'
  word: Word
  pool: Word[]
  settings: Settings
  footer: (result: AnswerResult) => ReactNode
}) {
  const [coin] = useState(() => Math.random() < 0.5)

  let resolved: PracticeMode
  if (mode === 'meaning') {
    const wantsChoice = settings.meaningDisplay === 'choice' || (settings.meaningDisplay === 'mixed' && coin)
    resolved = wantsChoice ? 'choice' : 'flip'
  } else {
    resolved = mode
  }
  if (resolved === 'choice' && !canBuildChoices(word, pool)) resolved = 'flip'

  switch (resolved) {
    case 'flip':
      return <FlipQuestion word={word} settings={settings} footer={footer} />
    case 'choice':
      return <ChoiceQuestion word={word} pool={pool} settings={settings} footer={footer} />
    default:
      return <TypingQuestion word={word} variant={resolved} settings={settings} footer={footer} />
  }
}
