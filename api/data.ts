import type { PageResponse } from '../src/shared/protocol.js'
import { requireAuth } from '../backend/auth.js'
import { collection, fromMongo, isCollectionName } from '../backend/db.js'
import { allowMethods, HttpError, json, route } from '../backend/http.js'

// Mỗi phản hồi của Vercel Function tối đa 4,5 MB nên dữ liệu được chia trang
const DEFAULT_LIMIT = 2000
const MAX_LIMIT = 5000

/** GET /api/data?collection=reviews&after=<id>&limit=2000 — đọc một trang, sắp theo id */
export default route(async (request) => {
  allowMethods(request, 'GET')
  requireAuth(request)

  const params = new URL(request.url).searchParams
  const name = params.get('collection')
  if (!isCollectionName(name)) throw new HttpError(400, 'Collection không hợp lệ.')
  const after = params.get('after')
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get('limit')) || DEFAULT_LIMIT))

  const docs = await (await collection(name))
    .find(after ? { _id: { $gt: after } } : {})
    .sort({ _id: 1 })
    .limit(limit)
    .toArray()

  return json({
    docs: docs.map(fromMongo),
    next: docs.length === limit ? docs[docs.length - 1]._id : null,
  } satisfies PageResponse)
})
