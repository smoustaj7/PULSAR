import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { VIEWS, type View } from '../lib/views'
import { Icon } from './Icon'

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

/**
 * The brand as the bar sets it: a pulse crossing an orbit ring, then the name in widely
 * spaced capitals, the way mission patches and launch sites letter it.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="13.25" fill="none" stroke="var(--accent)" strokeWidth="2" />
        <path
          d="M4.5 17h6l2.4-5.5 3.6 10 2.8-7.5 1.6 3h6.6"
          fill="none"
          stroke="var(--fg)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Wide capitals; the negative margin takes back the spacing after the last letter. */}
      <span
        className={`mr-[-0.38em] font-display text-[17px] leading-none font-medium tracking-[0.38em] text-fg ${compact ? 'hidden sm:inline' : ''}`}
      >
        PULSAR
      </span>
    </span>
  )
}

/** Whether the page has scrolled past the top, for the bar to pick up its material. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(() => window.scrollY > 4)
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 4))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return scrolled
}

/**
 * The bar: brand on the left; the views and the three things you do most on the right. At the
 * top of the page it is no bar at all, just type standing on the nebula; as soon as the page
 * moves it gathers a translucent material under it, so content can't run into the links.
 */
export function TopBar({
  view,
  onNavigate,
  crewName,
  onLog,
  onReport,
  onSettings,
  demo = false,
  onExitDemo,
}: {
  view: View
  onNavigate: (v: View) => void
  crewName: string
  onLog: () => void
  onReport: () => void
  onSettings: () => void
  /** While demo readings are showing, the demo's name; the bar then carries a way back to your own. */
  demo?: string | false
  onExitDemo?: () => void
}) {
  const scrolled = useScrolled()
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="group/bar sticky top-0 z-40 pt-[env(safe-area-inset-top)] [text-shadow:0_1px_14px_rgb(1_10_13/0.55)] data-scrolled:[text-shadow:none]"
    >
      {/* The material fades in under the bar rather than switching on. It has no edge: it runs
          a little past the bar and thins out, so content slides under a shade, not a line. */}
      <div
        aria-hidden
        className="material pointer-events-none absolute inset-x-0 top-0 -bottom-8 -z-10 opacity-0 transition-opacity duration-300 ease-out [mask-image:linear-gradient(to_bottom,#000_50%,transparent)] group-data-scrolled/bar:opacity-100"
      />
      {/* At the top a soft shade keeps the caps legible over the brightest clouds. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-32 bg-gradient-to-b from-ink-950/60 to-transparent transition-opacity duration-300 group-data-scrolled/bar:opacity-0"
      />

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 md:h-[4.5rem]">
        <a
          href="#overview"
          aria-label="PULSAR, go to the dashboard"
          onClick={(e) => {
            e.preventDefault()
            onNavigate('overview')
          }}
          className="flex min-w-0 items-center rounded-lg"
        >
          {/* On phones the name steps aside while the demo pill needs the room. */}
          <Wordmark compact={!!demo} />
        </a>

        {demo && (
          <button
            type="button"
            onClick={onExitDemo}
            aria-label="Exit demo data"
            title="Exit demo data and go back to your own readings"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 pr-1.5 pl-3 text-xs font-medium text-accent transition-[background-color,transform] duration-150 [text-shadow:none] hover:bg-accent/20 active:scale-[0.97]"
          >
            {demo}
            <span className="grid size-5 place-items-center rounded-full bg-accent/15" aria-hidden>
              <Icon name="close" className="size-3" />
            </span>
          </button>
        )}

        <nav aria-label="Views" data-tour="nav" className="ml-auto hidden h-full items-stretch gap-1 md:flex">
          {VIEWS.map((v) => {
            const active = v.id === view
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onNavigate(v.id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center px-3 font-display text-[13px] font-medium whitespace-nowrap uppercase tracking-[0.16em] transition-colors duration-150 lg:px-4 ${
                  active ? 'text-fg' : 'text-fg/70 hover:text-fg'
                }`}
              >
                {/* Inner span carries the underline so it spans the word, not the padding. */}
                <span className="relative py-2">
                  {v.label}
                  {active ? (
                    <motion.span
                      layoutId="view-underline"
                      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-accent"
                      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                    />
                  ) : (
                    <span className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-center scale-x-0 rounded-full bg-fg/35 transition-transform duration-200 ease-out group-hover:scale-x-100" />
                  )}
                </span>
              </button>
            )
          })}
        </nav>

        <span aria-hidden className="mx-2 hidden h-5 w-px bg-fg/20 md:block" />

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            onClick={onLog}
            data-tour="log"
            className="btn btn-primary px-3 [text-shadow:none] sm:px-4"
            aria-label="Log a reading"
          >
            <Icon name="plus" className="size-4.5" />
            <span className="hidden xl:inline">Log reading</span>
          </button>
          <button
            type="button"
            onClick={onReport}
            data-tour="report"
            className="btn min-h-10 border border-fg/25 px-3 text-fg transition-colors hover:border-fg/50 hover:bg-fg/8 sm:px-4"
            aria-label="Report to ground"
          >
            <Icon name="send" className="size-4" />
            <span className="hidden xl:inline">Report</span>
          </button>
          <button
            type="button"
            onClick={onSettings}
            data-tour="settings"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-fg/25 font-display text-[12px] font-semibold tracking-[0.06em] text-fg transition-[border-color,background-color,transform] duration-150 hover:border-fg/50 hover:bg-fg/8 active:scale-[0.97]"
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
      data-tour="nav"
      className="material fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
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
