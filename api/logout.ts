import { clearedSessionCookie } from '../backend/auth.js'
import { allowMethods, json, route } from '../backend/http.js'

export default route(async (request) => {
  allowMethods(request, 'POST')
  return json({ ok: true }, { headers: { 'set-cookie': clearedSessionCookie(request) } })
})
