import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  Dumbbell,
  GraduationCap,
  House,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Sun,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useDueCounts } from '../hooks/useDueCounts'
import { setThemePref, useIsDark } from '../hooks/useTheme'
import { cn } from '../lib/cn'
import { Logo } from './Logo'
import { SyncIndicator } from './SyncIndicator'
import { ButtonLink } from './ui'

const NAV = [
  { to: '/', label: 'Trang chủ', icon: House },
  { to: '/words', label: 'Từ vựng', icon: BookOpen },
  { to: '/practice', label: 'Luyện tập', icon: Dumbbell },
  { to: '/stats', label: 'Thống kê', icon: ChartColumn },
]

function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark()
  return (
    <button
      type="button"
      onClick={() => setThemePref(dark ? 'light' : 'dark')}
      title={dark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      aria-label={dark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      className={cn(
        'flex size-9 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  )
}

const sideLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
    isActive ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-ink-2 hover:bg-surface-2/70 hover:text-ink',
  )

function SideIcon({ icon: Icon, active }: { icon: typeof House; active: boolean }) {
  return (
    <Icon
      className={cn('size-4.5 transition-colors', active ? 'text-accent-ink' : 'text-muted group-hover:text-ink-2')}
    />
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const due = useDueCounts()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app-backdrop min-h-dvh text-ink">
      {/* Thanh bên cho màn hình lớn */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-surface-2/40 px-3.5 py-5 md:flex">
        <div className="flex items-center justify-between pr-0.5 pl-1.5">
          <NavLink to="/" aria-label="Vocab — Trang chủ">
            <Logo />
          </NavLink>
          <ThemeToggle />
        </div>

        <ButtonLink to="/words/new" variant="primary" className="mt-6 w-full">
          <Plus className="size-4.5" /> Thêm từ mới
        </ButtonLink>

        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Điều hướng chính">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={sideLinkClass}>
              {({ isActive }) => (
                <>
                  <SideIcon icon={icon} active={isActive} /> {label}
                </>
              )}
            </NavLink>
          ))}
          <NavLink to="/settings" className={sideLinkClass}>
            {({ isActive }) => (
              <>
                <SideIcon icon={SettingsIcon} active={isActive} /> Cài đặt
              </>
            )}
          </NavLink>
        </nav>

        {/* Thẻ ôn tập ở cuối thanh bên */}
        <Link
          to="/review"
          className="group mt-auto block overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-float"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-wash text-accent-ink">
              <GraduationCap className="size-4.5" />
            </span>
            <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-ink" />
          </div>
          <p className="mt-3 text-[13px] text-ink-2">Ôn tập hôm nay</p>
          <p className="font-display text-2xl leading-tight font-semibold text-ink tabular-nums">
            {due ? (due.total > 0 ? `${due.total} thẻ` : 'Đã xong') : '–'}
          </p>
          {due && due.total > 0 && (
            <div aria-hidden className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              <span className="bg-state-new" style={{ flex: due.newCount }} />
              <span className="bg-state-learning" style={{ flex: due.learningCount }} />
              <span className="bg-state-mature" style={{ flex: due.reviewCount }} />
            </div>
          )}
        </Link>
        <SyncIndicator className="mt-3 px-1.5" />
      </aside>

      {/* Thanh trên cho điện thoại */}
      <header className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <NavLink to="/" aria-label="Vocab — Trang chủ">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-1">
            <SyncIndicator compact className="px-2" />
            <ThemeToggle />
            <NavLink
              to="/settings"
              aria-label="Cài đặt"
              className={({ isActive }) =>
                cn(
                  'flex size-9 items-center justify-center rounded-xl transition-colors',
                  isActive ? 'bg-accent-wash text-accent-ink' : 'text-ink-2 hover:bg-surface-2',
                )
              }
            >
              <SettingsIcon className="size-4.5" />
            </NavLink>
          </div>
        </div>
      </header>

      <main className="px-4 pt-6 pb-32 sm:px-6 md:pt-10 md:pb-16 md:pl-72 lg:pr-10 lg:pl-76">
        <div key={pathname} className="mx-auto max-w-4xl animate-fade-up">
          <Outlet />
        </div>
      </main>

      {/* Thanh điều hướng nổi cho điện thoại */}
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 rounded-2xl border border-line bg-surface/85 shadow-float backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-5 items-center px-1">
          {NAV.slice(0, 2).map((item) => (
            <BottomLink key={item.to} {...item} />
          ))}
          <NavLink to="/words/new" aria-label="Thêm từ mới" className="flex items-center justify-center py-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-button transition-transform active:scale-95">
              <Plus className="size-5.5" />
            </span>
          </NavLink>
          {NAV.slice(2).map((item) => (
            <BottomLink key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function BottomLink({ to, label, icon: Icon }: (typeof NAV)[number]) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors',
          isActive ? 'text-accent-ink' : 'text-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex h-7 w-11 items-center justify-center rounded-full transition-colors',
              isActive && 'bg-accent-wash',
            )}
          >
            <Icon className="size-4.5" />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}
