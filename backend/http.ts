import type { ErrorResponse } from '../src/shared/protocol.js'
import { ConfigError } from './env.js'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function json(data: unknown, init: { status?: number; headers?: HeadersInit } = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')
  return new Response(JSON.stringify(data), { status: init.status ?? 200, headers })
}

export function allowMethods(request: Request, ...methods: string[]) {
  if (!methods.includes(request.method)) throw new HttpError(405, 'Phương thức không được hỗ trợ.')
}

/** Đọc body JSON. Bắt buộc content-type JSON để trình duyệt chặn các form gửi chéo trang. */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    throw new HttpError(415, 'Yêu cầu phải gửi dạng JSON.')
  }
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, 'JSON không hợp lệ.')
  }
}

/** Bọc handler: chuyển lỗi thành phản hồi JSON có mã lỗi phù hợp */
export function route(handler: (request: Request) => Promise<Response>) {
  return {
    async fetch(request: Request): Promise<Response> {
      try {
        return await handler(request)
      } catch (error) {
        if (error instanceof HttpError) {
          return json({ error: error.message } satisfies ErrorResponse, { status: error.status })
        }
        console.error(error)
        const message =
          error instanceof ConfigError ? `Server chưa cấu hình đúng: ${error.message}` : 'Lỗi máy chủ, thử lại sau.'
        return json({ error: message } satisfies ErrorResponse, { status: 500 })
      }
    },
  }
}
