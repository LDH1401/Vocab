import { Rating, type Grade } from 'ts-fsrs'
import type { Verdict } from '../../lib/answer'

export interface AnswerResult {
  /** null: người học tự đánh giá (lật thẻ) */
  verdict: Verdict | null
  hinted: boolean
}

/** Mức đánh giá gợi ý dựa trên kết quả chấm tự động */
export function suggestGrade(result: AnswerResult): Grade | null {
  if (result.verdict === null) return null
  if (result.verdict === 'wrong') return Rating.Again
  if (result.verdict === 'close' || result.hinted) return Rating.Hard
  return Rating.Good
}
