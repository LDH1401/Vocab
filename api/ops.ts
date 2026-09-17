import { requireAuth } from '../backend/auth.js'
import { allowMethods, json, readJson, route } from '../backend/http.js'
import { parseOps, runOps } from '../backend/ops.js'

/** POST /api/ops { ops: Op[] } — ghi dữ liệu theo đúng thứ tự thao tác */
export default route(async (request) => {
  allowMethods(request, 'POST')
  requireAuth(request)
  await runOps(parseOps(await readJson(request)))
  return json({ ok: true })
})
