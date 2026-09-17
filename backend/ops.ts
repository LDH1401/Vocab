import type { AnyBulkWriteOperation } from 'mongodb'
import type { Op, StoredDoc } from '../src/shared/protocol.js'
import { collection, isCollectionName, toMongo, type MongoDoc } from './db.js'
import { HttpError } from './http.js'

const MAX_OPS = 200
const MAX_ITEMS_PER_OP = 5000

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 100

function bad(message: string): never {
  throw new HttpError(400, message)
}

function readIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS_PER_OP || !value.every(isId)) bad('Danh sách id không hợp lệ.')
  return value
}

function readDocs(value: unknown): StoredDoc[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS_PER_OP) bad('Danh sách bản ghi không hợp lệ.')
  for (const doc of value) {
    if (!isObj(doc) || !isId(doc.id) || '_id' in doc) bad('Bản ghi thiếu id hợp lệ.')
    if (Object.keys(doc).some((key) => key.startsWith('$'))) bad('Tên trường không hợp lệ.')
  }
  return value as StoredDoc[]
}

/** Kiểm tra dữ liệu gửi lên, chỉ cho phép đúng các thao tác và collection đã định nghĩa */
export function parseOps(body: unknown): Op[] {
  if (!isObj(body) || !Array.isArray(body.ops) || body.ops.length > MAX_OPS) bad('Yêu cầu không hợp lệ.')
  return body.ops.map((raw): Op => {
    if (!isObj(raw)) bad('Thao tác không hợp lệ.')
    if (raw.type === 'deleteCardsOfWords') return { type: raw.type, wordIds: readIds(raw.wordIds) }
    if (!isCollectionName(raw.collection)) bad('Collection không hợp lệ.')
    switch (raw.type) {
      case 'put':
        return { type: 'put', collection: raw.collection, docs: readDocs(raw.docs) }
      case 'delete':
        return { type: 'delete', collection: raw.collection, ids: readIds(raw.ids) }
      case 'clear':
        return { type: 'clear', collection: raw.collection }
      default:
        return bad('Loại thao tác không hợp lệ.')
    }
  })
}

/** Chạy lần lượt từng thao tác. put dùng upsert nên gửi lại (khi mạng chập chờn) vẫn an toàn. */
export async function runOps(ops: Op[]): Promise<void> {
  for (const op of ops) {
    switch (op.type) {
      case 'put': {
        if (op.docs.length === 0) break
        const writes: AnyBulkWriteOperation<MongoDoc>[] = op.docs.map((doc) => {
          const { _id, ...replacement } = toMongo(doc)
          return { replaceOne: { filter: { _id }, replacement, upsert: true } }
        })
        await (await collection(op.collection)).bulkWrite(writes, { ordered: false })
        break
      }
      case 'delete':
        if (op.ids.length > 0) await (await collection(op.collection)).deleteMany({ _id: { $in: op.ids } })
        break
      case 'deleteCardsOfWords':
        if (op.wordIds.length > 0) await (await collection('cards')).deleteMany({ wordId: { $in: op.wordIds } })
        break
      case 'clear':
        await (await collection(op.collection)).deleteMany({})
        break
    }
  }
}
