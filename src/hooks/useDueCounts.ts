import { useEffect, useMemo, useState } from 'react'
import { buildReviewData } from '../db/review'
import { useData } from '../db/store'
import { MINUTE } from '../lib/date'
import { countQueue, type QueueCounts } from '../lib/queue'

export interface DueCounts extends QueueCounts {
  total: number
  nextDue: number | null
}

/** Số thẻ cần ôn hôm nay; tự tính lại mỗi phút vì thẻ đang học đến hạn theo phút */
export function useDueCounts(): DueCounts {
  const data = useData()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE)
    return () => clearInterval(timer)
  }, [])
  return useMemo(() => {
    const review = buildReviewData(data, now)
    const counts = countQueue(review.queue)
    return {
      ...counts,
      total: counts.newCount + counts.learningCount + counts.reviewCount,
      nextDue: review.nextDue,
    }
  }, [data, now])
}
