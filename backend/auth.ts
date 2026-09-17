import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { appPassword, authSecret } from './env.js'
import { HttpError } from './http.js'

const COOKIE_NAME = 'vocab_session'
const SESSION_DAYS = 180

const sha256 = (value: string) => createHash('sha256').update(value).digest()

function sign(expiresAt: number): string {
  // Gộp cả mật khẩu vào chữ ký: đổi APP_PASSWORD là mọi phiên cũ hết hiệu lực
  return createHmac('sha256', authSecret())
    .update(`${expiresAt}.`)
    .update(sha256(appPassword()))
    .digest('base64url')
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b)
}

export function passwordMatches(candidate: string): boolean {
  return safeEqual(sha256(candidate), sha256(appPassword()))
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

export function isAuthenticated(request: Request): boolean {
  const token = readCookie(request, COOKIE_NAME)
  const [version, exp, signature] = token?.split('.') ?? []
  if (version !== 'v1' || !exp || !signature) return false
  const expiresAt = Number(exp)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false
  return safeEqual(Buffer.from(signature), Buffer.from(sign(expiresAt)))
}

export function requireAuth(request: Request) {
  if (!isAuthenticated(request)) throw new HttpError(401, 'Phiên đăng nhập đã hết hạn.')
}

function cookieAttributes(request: Request): string {
  const https = new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  return `Path=/; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`
}

export function sessionCookie(request: Request): string {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const maxAge = SESSION_DAYS * 24 * 60 * 60
  return `${COOKIE_NAME}=v1.${expiresAt}.${sign(expiresAt)}; Max-Age=${maxAge}; ${cookieAttributes(request)}`
}

export function clearedSessionCookie(request: Request): string {
  return `${COOKIE_NAME}=; Max-Age=0; ${cookieAttributes(request)}`
}
