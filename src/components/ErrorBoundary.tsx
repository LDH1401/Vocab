import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const storageBlocked = /indexeddb|database|quota|storage/i.test(`${error.name} ${error.message}`)
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">Đã có lỗi xảy ra</h1>
        <p className="mt-2 text-sm text-ink-2">
          {storageBlocked
            ? 'Trình duyệt không cho phép lưu dữ liệu (có thể do chế độ ẩn danh hoặc đã chặn bộ nhớ trang web).'
            : 'Dữ liệu của bạn vẫn được lưu trong trình duyệt. Thử tải lại trang.'}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-surface-2 p-3 text-left text-xs text-ink-2">{error.message}</pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mx-auto mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg shadow-button hover:bg-accent-hover"
        >
          Tải lại trang
        </button>
      </div>
    )
  }
}
