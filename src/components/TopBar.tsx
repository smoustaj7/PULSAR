import { motion } from 'framer-motion'
import { VIEWS, type View } from '../lib/views'
import { Icon } from './Icon'

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

export function Logo() {
  return (
    <svg viewBox="0 0 512 512" className="size-8 shrink-0" aria-hidden>
      <rect width="512" height="512" rx="120" fill="#0F4C5C" />
      <path
        d="M72 272h96l36-88 56 176 44-120 24 32h112"
        fill="none"
        stroke="#A8DADC"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="404" cy="132" r="26" fill="#2A9D8F" />
    </svg>
  )
}

/** Translucent bar: brand and mission context on the left, the three things you do most on the right. */
export function TopBar({
  view,
  onNavigate,
  missionDay,
  environmentLabel,
  crewName,
  onLog,
  onReport,
  onSettings,
}: {
  view: View
  onNavigate: (v: View) => void
  missionDay: number
  environmentLabel: string
  crewName: string
  onLog: () => void
  onReport: () => void
  onSettings: () => void
}) {
  return (
    <header className="material sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('overview')
          }}
          className="flex min-w-0 items-center gap-2.5 rounded-lg"
        >
          <Logo />
          <span className="min-w-0">
            <span className="display block text-[22px] leading-5 tracking-[0.02em]">
              Astro<span className="text-accent">Pulse</span>
            </span>
            <span className="block truncate font-mono text-[10.5px] tracking-[0.06em] text-fg-subtle uppercase">
              Day {missionDay} · {environmentLabel}
            </span>
          </span>
        </a>

        <nav aria-label="Views" className="mx-auto hidden rounded-lg bg-white/5 p-1 md:flex">
          {VIEWS.map((v) => {
            const active = v.id === view
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onNavigate(v.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-md px-3 py-1.5 font-display whitespace-nowrap text-[15px] font-semibold tracking-[0.05em] uppercase transition-colors ${
                  active ? 'text-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="view-pill"
                    className="absolute inset-0 rounded-md bg-white/10"
                    transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                  />
                )}
                <span className="relative">{v.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button type="button" onClick={onLog} className="btn btn-primary px-3 sm:px-4" aria-label="Log a reading">
            <Icon name="plus" className="size-4.5" />
            <span className="hidden xl:inline">Log reading</span>
          </button>
          <button type="button" onClick={onReport} className="btn btn-secondary px-3 sm:px-4" aria-label="Report to ground">
            <Icon name="send" className="size-4" />
            <span className="hidden xl:inline">Report to ground</span>
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="btn btn-plain size-10 min-h-0 p-0 text-xs"
            aria-label={`Mission settings for ${crewName}`}
            title="Mission settings"
          >
            {initials(crewName)}
          </button>
        </div>
      </div>
    </header>
  )
}

/** Phone navigation: a bottom tab bar within thumb reach. */
export function TabBar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  return (
    <nav
      aria-label="Views"
      className="material fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {VIEWS.map((v) => {
          const active = v.id === view
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onNavigate(v.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? 'text-accent' : 'text-fg-subtle'
                }`}
              >
                <Icon name={v.icon} className="size-6" />
                {v.short}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
