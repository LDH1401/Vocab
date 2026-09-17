import type { SessionResponse } from '../src/shared/protocol.js'
import { isAuthenticated } from '../backend/auth.js'
import { allowMethods, json, route } from '../backend/http.js'

export default route(async (request) => {
  allowMethods(request, 'GET')
  return json({ authenticated: isAuthenticated(request) } satisfies SessionResponse)
})
