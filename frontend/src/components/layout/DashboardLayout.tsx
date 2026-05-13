import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NAV_ITEMS, MONTHS, PageId } from '@/constants'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage: PageId
  onPageChange: (page: PageId) => void
  month: number
  year: number
  onMonthChange: (dir: 1 | -1) => void
}

export function DashboardLayout({
  children,
  currentPage,
  onPageChange,
  month,
  year,
  onMonthChange,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [mobileMenu, setMobileMenu] = useState(false)

  // Pages that use the month selector
  const MONTH_PAGES: PageId[] = ['overview', 'transactions', 'budget', 'report']
  const showMonthNav = MONTH_PAGES.includes(currentPage)

  // Bottom nav shows first 5 items only
  const BOTTOM_NAV = NAV_ITEMS.slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-white/10"
        style={{
          background: 'linear-gradient(135deg,#0d1f3c,#0a0f1e)',
          boxShadow: '0 2px 24px #00000060',
        }}
      >
        <div className="text-xl font-black text-blue-400">💰 PlannerPro</div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              onClick={() => onPageChange(n.id)}
              className={[
                'px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all',
                currentPage === n.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Month navigator — only on relevant pages */}
          {showMonthNav && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onMonthChange(-1)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 text-white font-bold transition-colors"
              >
                ‹
              </button>
              <span className="text-blue-300 font-bold text-sm min-w-[120px] text-center">
                {MONTHS[month]} {year}
              </span>
              <button
                onClick={() => onMonthChange(1)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 text-white font-bold transition-colors"
              >
                ›
              </button>
            </div>
          )}

          <span className="hidden sm:block text-sm text-slate-400">
            👤 {user?.name?.split(' ')[0]}
          </span>
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg border border-slate-700 hover:border-red-800"
          >
            Sair
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setMobileMenu(v => !v)}
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <span className={`block w-5 h-0.5 bg-slate-300 transition-transform ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-slate-300 transition-opacity   ${mobileMenu ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-slate-300 transition-transform ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {/* ── Mobile dropdown menu ── */}
      {mobileMenu && (
        <div
          className="md:hidden sticky top-[57px] z-20 border-b border-white/10 px-4 py-3 flex flex-col gap-1"
          style={{ background: '#0d1f3c' }}
        >
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              onClick={() => { onPageChange(n.id); setMobileMenu(false) }}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                currentPage === n.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              <span className="text-lg">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <main className="max-w-[1200px] mx-auto px-5 py-6 pb-24 md:pb-6 flex flex-col gap-6">
        {children}
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10"
        style={{ background: '#0d1f3c' }}
      >
        {BOTTOM_NAV.map(n => (
          <button
            key={n.id}
            onClick={() => onPageChange(n.id)}
            className={[
              'flex-1 flex flex-col items-center py-2.5 gap-1 text-[10px] font-semibold transition-colors',
              currentPage === n.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            <span className="text-lg">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

    </div>
  )
}