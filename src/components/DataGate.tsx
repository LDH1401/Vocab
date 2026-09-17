import { Eye, EyeOff, LockKeyhole, RotateCw, ServerCrash } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { loadAll, startBackgroundSync } from '../db/store'
import { ApiError, apiGet, apiPost, errorMessage, onUnauthorized } from '../lib/api'
import type { SessionResponse } from '../shared/protocol'
import { LogoMark } from './Logo'
import { Button, Input, Spinner } from './ui'

type Phase = 'checking' | 'login' | 'loading' | 'ready' | 'error'

/** Chỉ hiện ứng dụng khi đã đăng nhập và tải xong dữ liệu từ MongoDB */
export function DataGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [error, setError] = useState('')

  const fail = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      setPhase('login')
    } else {
      setError(errorMessage(err))
      setPhase('error')
    }
  }, [])

  const loadData = useCallback(async () => {
    setPhase('loading')
    try {
      await loadAll()
      setPhase('ready')
    } catch (err) {
      fail(err)
    }
  }, [fail])

  const start = useCallback(async () => {
    try {
      const session = await apiGet<SessionResponse>('session')
      if (session.authenticated) await loadData()
      else setPhase('login')
    } catch (err) {
      fail(err)
    }
  }, [fail, loadData])

  useEffect(() => {
    void start()
  }, [start])

  useEffect(() => onUnauthorized(() => setPhase('login')), [])

  useEffect(() => (phase === 'ready' ? startBackgroundSync() : undefined), [phase])

  if (phase === 'ready') return <>{children}</>

  return (
    <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-ink">
      {phase === 'login' ? (
        <LoginForm onSuccess={loadData} />
      ) : phase === 'error' ? (
        <div className="w-full max-w-sm animate-fade-up text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-critical-wash text-critical-ink">
            <ServerCrash className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Không tải được dữ liệu</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{error}</p>
          <Button
            variant="primary"
            size="lg"
            className="mt-6"
            onClick={() => {
              setPhase('checking')
              void start()
            }}
          >
            <RotateCw className="size-4.5" /> Thử lại
          </Button>
        </div>
      ) : (
        <div className="flex animate-fade-in flex-col items-center gap-4 text-center">
          <LogoMark className="size-12 [&_svg]:size-7" />
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Spinner className="text-accent-ink" />
            {phase === 'loading' ? 'Đang tải dữ liệu từ MongoDB…' : 'Đang kết nối…'}
          </p>
        </div>
      )}
    </div>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return
    setSubmitting(true)
    setError('')
    try {
      await apiPost('login', { password })
      onSuccess()
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
      inputRef.current?.select()
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <LogoMark className="size-14 rounded-2xl [&_svg]:size-8" />
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Vocab</h1>
        <p className="mt-1.5 text-sm text-ink-2">Nhập mật khẩu để mở sổ từ vựng của bạn.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-float sm:p-6">
        <label htmlFor="password" className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <LockKeyhole className="size-3.5 text-muted" /> Mật khẩu
        </label>
        <div className="relative mt-2">
          <Input
            ref={inputRef}
            id="password"
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className="h-12 pr-11 text-base"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          >
            {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        </div>
        {error && (
          <p id="login-error" role="alert" className="mt-2 text-[13px] font-medium text-critical-ink">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="mt-5 w-full" disabled={submitting || !password}>
          {submitting && <Spinner />} Đăng nhập
        </Button>
      </form>
    </div>
  )
}
