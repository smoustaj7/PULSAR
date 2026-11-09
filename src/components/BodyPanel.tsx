import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, lazy, useState } from 'react'
import type { RegionAssessment, Status } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { BodyMap } from './BodyMap'
import { Icon } from './Icon'
import { ModelBoundary } from './ModelBoundary'
import { StatusBadge } from './StatusBadge'

const RANK: Record<Status, number> = { critical: 3, caution: 2, nominal: 1, unknown: 0 }

// three.js and the model are loaded only when the panel renders, so the rest of the
// dashboard does not wait on them.
const BodyModel3D = lazy(() => import('./BodyModel3D'))

const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * The body model with a short summary of the chosen system underneath. Kept compact so it
 * fits beside the dashboard; the full detail opens in a sheet.
 */
export function BodyPanel({
  regions,
  selectedId,
  onSelect,
  onTrend,
  onLog,
  onDetails,
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onTrend: (indicatorId: string) => void
  onLog: (indicatorId: string) => void
  onDetails: (regionId: string) => void
}) {
  const selected = regions.find((r) => r.region.id === selectedId) ?? null
  // When nothing is chosen, point at the system that most needs a look.
  const worst = [...regions].sort((a, b) => RANK[b.status] - RANK[a.status])[0]
  const suggestion = worst && (worst.status === 'critical' || worst.status === 'caution') ? worst : null
  const [webgl] = useState(hasWebGL)
  const [showSuit, setShowSuit] = useState(false)
  const toggle = (id: string | null) => onSelect(id === selectedId ? null : id)
  const heartRate =
    regions.flatMap((r) => r.evaluations).find((e) => e.indicator.id === 'heartRate')?.reading?.value ?? 68
  const flat = <BodyMap regions={regions} selectedId={selectedId} onSelect={toggle} />

  return (
    <section
      id="body-systems"
      aria-labelledby="body-title"
      className="surface flex scroll-mt-20 flex-col overflow-hidden lg:max-h-[calc(100dvh-7rem)]"
      style={{ backgroundImage: 'radial-gradient(26rem 24rem at 50% 42%, rgb(91 192 222 / 0.09), transparent 70%)' }}
    >
      <header className="flex shrink-0 items-start gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="body-title" className="text-[15px] font-semibold tracking-tight">
            Your body
          </h2>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {webgl
              ? 'Systems that need attention glow amber or red. Drag to turn, tap to look closer.'
              : 'Each system takes the color of its worst reading. Tap one to look closer.'}
          </p>
        </div>
        {webgl && (
          <button
            type="button"
            aria-pressed={showSuit}
            onClick={() => setShowSuit((v) => !v)}
            className={`btn btn-sm shrink-0 border ${showSuit ? 'border-accent bg-accent/12 text-accent' : 'border-line bg-white/4 text-fg-muted hover:text-fg'}`}
          >
            {showSuit ? 'Suit on' : 'Suit off'}
          </button>
        )}
      </header>

      <div className="relative h-[380px] shrink-0 px-2 py-2 sm:h-[420px] lg:h-[clamp(260px,calc(100dvh-31rem),500px)]">
        {webgl ? (
          <ModelBoundary fallback={<div className="size-full px-2 py-1">{flat}</div>}>
            <Suspense
              fallback={
                <div className="relative size-full px-2 py-1 opacity-60">
                  {flat}
                  <p className="absolute inset-x-0 bottom-1 text-center text-xs text-fg-subtle">Loading 3D model…</p>
                </div>
              }
            >
              <BodyModel3D regions={regions} selectedId={selectedId} showSuit={showSuit} heartRate={heartRate} onSelect={toggle} />
            </Suspense>
          </ModelBoundary>
        ) : (
          <div className="size-full px-2 py-1">{flat}</div>
        )}
      </div>

      {webgl && (
        <div
          role="group"
          aria-label="Body systems"
          className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-5"
        >
          {regions.map((r) => {
            const active = r.region.id === selectedId
            return (
              <button
                key={r.region.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(r.region.id)}
                className={`btn btn-sm shrink-0 border ${
                  active ? 'border-accent bg-accent text-navy-950' : 'border-line bg-white/4 text-fg-muted hover:text-fg'
                }`}
              >
                <span className={`size-2 rounded-full ${STATUS_META[r.status].dot} ${active ? 'ring-2 ring-navy-950/30' : ''}`} />
                {r.region.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line bg-navy-950/30 p-4 sm:px-5" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={selected?.region.id ?? 'none'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {selected ? (
              <SystemSummary assessment={selected} onClose={() => onSelect(null)} onTrend={onTrend} onLog={onLog} onDetails={onDetails} />
            ) : (
              <div>
                <p className="text-sm text-fg-muted">Choose a body system on the model to see its readings.</p>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => onSelect(suggestion.region.id)}
                    className="mt-3 flex w-full items-center gap-3 rounded-xl border border-line bg-white/4 px-3 py-2.5 text-left transition-colors hover:bg-white/8"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-fg-subtle">Start with</span>
                      <span className="block text-sm font-medium">{suggestion.region.label}</span>
                    </span>
                    <StatusBadge status={suggestion.status} />
                    <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

function SystemSummary({
  assessment: a,
  onClose,
  onTrend,
  onLog,
  onDetails,
}: {
  assessment: RegionAssessment
  onClose: () => void
  onTrend: (indicatorId: string) => void
  onLog: (indicatorId: string) => void
  onDetails: (regionId: string) => void
}) {
  const flagged = [...a.evaluations].sort((x, y) => RANK[y.status] - RANK[x.status]).find((e) => e.status === 'critical' || e.status === 'caution')
  const toLog = flagged ?? a.evaluations[0]

  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-semibold">{a.region.label}</h3>
        <StatusBadge status={a.status} />
        <button type="button" onClick={onClose} className="btn btn-plain size-8 min-h-0 shrink-0 p-0" aria-label="Clear selection">
          <Icon name="close" className="size-4" />
        </button>
      </div>

      <ul className="-mx-2 mt-2">
        {a.evaluations.map((e) => {
          const m = STATUS_META[e.status]
          const off = e.status === 'caution' || e.status === 'critical'
          return (
            <li key={e.indicator.id}>
              <button
                type="button"
                onClick={() => onTrend(e.indicator.id)}
                className="group flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-white/5"
              >
                <span className={`size-2 shrink-0 rounded-full ${m.dot}`} />
                <span className="min-w-0 flex-1 truncate text-sm text-fg-muted group-hover:text-fg">{e.indicator.label}</span>
                <span className={`text-sm font-semibold tabular-nums ${off ? m.text : 'text-fg'}`}>
                  {e.reading ? formatValue(e.indicator, e.reading.value) : '—'}
                  <span className="ml-1 text-xs font-normal text-fg-subtle">{e.indicator.unit}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {flagged && (
        <p className={`mt-2 rounded-xl border px-3 py-2 text-sm text-fg ${STATUS_META[flagged.status].border} ${STATUS_META[flagged.status].bg}`}>
          <span className="font-medium">{flagged.indicator.label}: </span>
          {flagged.guidance}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {toLog && (
          <button type="button" onClick={() => onLog(toLog.indicator.id)} className="btn btn-tinted btn-sm min-w-0">
            <Icon name="plus" className="size-3.5 shrink-0" />
            <span className="truncate">Log {toLog.indicator.label}</span>
          </button>
        )}
        <button type="button" onClick={() => onDetails(a.region.id)} className="btn btn-plain btn-sm ml-auto">
          Details <Icon name="chevron" className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
