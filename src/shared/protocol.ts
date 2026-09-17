/**
 * Giao thức giữa trình duyệt và API. File này chỉ chứa kiểu dữ liệu để backend (thư mục api/, backend/)
 * có thể `import type` mà không kéo theo mã chạy của frontend.
 */

export type CollectionName = 'words' | 'cards' | 'reviews' | 'practice' | 'settings'

/** Mọi bản ghi (từ, thẻ, lượt ôn…) đều có id dạng chuỗi */
export interface StoredDoc {
  id: string
}

/** Một thao tác ghi. Trình duyệt áp dụng ngay vào bộ nhớ, rồi gửi đúng các thao tác đó lên server. */
export type Op =
  | { type: 'put'; collection: CollectionName; docs: StoredDoc[] }
  | { type: 'delete'; collection: CollectionName; ids: string[] }
  | { type: 'deleteCardsOfWords'; wordIds: string[] }
  | { type: 'clear'; collection: CollectionName }

export interface OpsRequest {
  ops: Op[]
}

export interface PageResponse {
  docs: StoredDoc[]
  /** id cuối của trang, null nếu đã hết */
  next: string | null
}

export interface SessionResponse {
  authenticated: boolean
}

export interface ErrorResponse {
  error: string
}
