import type { ErrorResponse } from '../shared/protocol'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const unauthorizedListeners = new Set<() => void>()

/** Gọi khi server báo phiên đăng nhập không còn hợp lệ */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

export function notifyUnauthorized() {
  unauthorizedListeners.forEach((listener) => listener())
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
  })
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // Phản hồi không phải JSON (ví dụ trang lỗi của proxy)
  }
  if (!response.ok) {
    if (response.status === 401 && path !== 'login') notifyUnauthorized()
    const message = (data as ErrorResponse | null)?.error ?? `Máy chủ trả lỗi ${response.status}.`
    throw new ApiError(response.status, message)
  }
  return data as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
  return 'Đã có lỗi xảy ra.'
}
