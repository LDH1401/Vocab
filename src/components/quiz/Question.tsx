import { PencilLine } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { PracticeMode, Settings, Word } from '../../db/types'
import { canBuildChoices } from '../../lib/choices'
import { resolveAccent } from '../../lib/speech'
import { EditWordDialog } from '../EditWordDialog'
import { Button } from '../ui'
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
  // Chế độ giọng ngẫu nhiên: chốt một giọng cho cả câu hỏi để "Nghe lại" không đổi giọng giữa chừng
  const [accent] = useState(() => resolveAccent(settings.accent))
  const questionSettings = useMemo(() => ({ ...settings, accent }), [settings, accent])
  const [editing, setEditing] = useState(false)

  // Trả lời xong mới hiện nút sửa, để không lộ đáp án
  const footerWithEdit = (result: AnswerResult) => (
    <>
      <div className="-mb-2 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <PencilLine className="size-4" /> Sửa từ
        </Button>
      </div>
      {footer(result)}
    </>
  )
  const editDialog = <EditWordDialog open={editing} onClose={() => setEditing(false)} word={word} />

  let resolved: PracticeMode
  if (mode === 'meaning') {
    const wantsChoice = settings.meaningDisplay === 'choice' || (settings.meaningDisplay === 'mixed' && coin)
    resolved = wantsChoice ? 'choice' : 'flip'
  } else {
    resolved = mode
  }
  if (resolved === 'choice' && !canBuildChoices(word, pool)) resolved = 'flip'

  const question =
    resolved === 'flip' ? (
      <FlipQuestion word={word} settings={questionSettings} footer={footerWithEdit} />
    ) : resolved === 'choice' ? (
      <ChoiceQuestion word={word} pool={pool} settings={questionSettings} footer={footerWithEdit} />
    ) : (
      <TypingQuestion word={word} variant={resolved} settings={questionSettings} footer={footerWithEdit} />
    )

  return (
    <>
      {question}
      {editDialog}
    </>
  )
}
