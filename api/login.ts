import { passwordMatches, sessionCookie } from '../backend/auth.js'
import { allowMethods, HttpError, json, readJson, route } from '../backend/http.js'

const FAILED_LOGIN_DELAY_MS = 800

export default route(async (request) => {
  allowMethods(request, 'POST')
  const body = await readJson(request)
  const password = typeof body === 'object' && body !== null && 'password' in body ? body.password : undefined
  if (typeof password !== 'string' || !passwordMatches(password)) {
    // Làm chậm việc dò mật khẩu
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS))
    throw new HttpError(401, 'Mật khẩu không đúng.')
  }
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(request) } })
})
