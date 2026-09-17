import { commit } from './store'
import type { PracticeRecord } from './types'

export function addPracticeRecord(record: PracticeRecord) {
  void commit([{ type: 'put', collection: 'practice', docs: [record] }])
}
