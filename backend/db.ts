import { MongoClient, type Collection, type Db } from 'mongodb'
import type { CollectionName, StoredDoc } from '../src/shared/protocol.js'
import { mongoDbName, mongoUri } from './env.js'

export const COLLECTIONS = ['words', 'cards', 'reviews', 'practice', 'settings'] as const satisfies readonly CollectionName[]

/** Tài liệu trong MongoDB: id của ứng dụng được dùng làm _id */
export type MongoDoc = { _id: string } & Record<string, unknown>

// Giữ kết nối giữa các lần gọi function để không phải kết nối lại mỗi request
let dbPromise: Promise<Db> | undefined

async function connect(): Promise<Db> {
  const client = new MongoClient(mongoUri(), { maxPoolSize: 5, maxIdleTimeMS: 60_000 })
  await client.connect()
  const db = client.db(mongoDbName())
  await db.collection('cards').createIndex({ wordId: 1 })
  return db
}

export function getDb(): Promise<Db> {
  dbPromise ??= connect().catch((error: unknown) => {
    dbPromise = undefined
    throw error
  })
  return dbPromise
}

export async function collection(name: CollectionName): Promise<Collection<MongoDoc>> {
  return (await getDb()).collection<MongoDoc>(name)
}

export function isCollectionName(value: unknown): value is CollectionName {
  return COLLECTIONS.includes(value as CollectionName)
}

export function toMongo(doc: StoredDoc): MongoDoc {
  const { id, ...rest } = doc as StoredDoc & Record<string, unknown>
  return { ...rest, _id: id }
}

export function fromMongo({ _id, ...rest }: MongoDoc): StoredDoc {
  return { ...rest, id: _id }
}
