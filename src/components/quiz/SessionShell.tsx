import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../ui'

/** Khung toàn màn hình cho phiên ôn tập/luyện tập, che thanh điều hướng để tập trung */
export function SessionShell({
  progress,
  onExit,
  right,
  children,
}: {
  /** 0..1, null để ẩn thanh tiến độ */
  progress: number | null
  onExit: () => void
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="app-backdrop fixed inset-0 z-40 overflow-y-auto text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-page/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Thoát phiên học" title="Thoát">
            <X className="size-5" />
          </Button>
          <div className="flex-1 px-1">
            {progress !== null && (
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                aria-label="Tiến độ"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                />
              </div>
            )}
          </div>
          {right}
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-20 sm:pt-10">{children}</main>
    </div>
  )
}
