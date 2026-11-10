import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Suspense, lazy, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { createPortal } from 'react-dom'
import type { RegionAssessment, Status } from '../engine/types'
import { STATUS_META, formatValue } from '../lib/status'
import { BodyMap } from './BodyMap'
import { Icon } from './Icon'
import { ModelBoundary } from './ModelBoundary'
import { StatusBadge } from './StatusBadge'
import { SystemsNav } from './SystemsNav'

const RANK: Record<Status, number> = { critical: 3, caution: 2, nominal: 1, unknown: 0 }
const CARD_RADIUS = 12
const EXPAND = { type: 'spring', bounce: 0, duration: 0.55 } as const

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

/** What the rest of the page can ask of the body model. */
export interface BodyPanelHandle {
  /** Grow the model into the full-screen stage (it turns to whatever system is selected). */
  expand: () => void
}

const createHost = () => {
  const el = document.createElement('div')
  el.className = 'absolute inset-0'
  return el
}

/**
 * The body model, small. It sits in the hero as a preview; pressing it (or picking a system
 * or a reading anywhere on the page) grows the same model into a full-screen stage where it
 * can be turned, its organs picked, and the chosen system's readings read.
 *
 * There is one canvas. It is rendered into a host element that moves between the card and
 * the stage, so the model, its camera and the WebGL context all survive the move. The
 * growth itself is a transform: the stage-sized canvas starts scaled down onto the card
 * (matching heights keeps the model the same size on screen, since a perspective camera
 * frames by height), clipped to the card's outline, and springs to its natural place. When
 * the card is scrolled out of view there is nothing to grow from, so the stage fades and
 * settles in place instead.
 */
export function BodyPanel({
  regions,
  selectedId,
  onSelect,
  onTrend,
  onLog,
  onDetails,
  ref,
}: {
  ref?: Ref<BodyPanelHandle>
  regions: RegionAssessment[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onTrend: (indicatorId: string) => void
  onLog: (indicatorId: string) => void
  onDetails: (regionId: string) => void
}) {
  const selected = regions.find((r) => r.region.id === selectedId) ?? null
  const [webgl] = useState(hasWebGL)
  const [showSuit, setShowSuit] = useState(false)
  const toggle = (id: string | null) => onSelect(id === selectedId ? null : id)
  const heartRate =
    regions.flatMap((r) => r.evaluations).find((e) => e.indicator.id === 'heartRate')?.reading?.value ?? 68
  const flat = <BodyMap regions={regions} selectedId={selectedId} onSelect={toggle} />

  const [host] = useState(createHost)
  const cardSlot = useRef<HTMLDivElement>(null)
  const stageSlot = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  // `open` says where the canvas lives; `progress` (0 card, 1 stage) says how it looks.
  const [open, setOpen] = useState(false)
  const goal = useRef(0)
  const reduce = useReducedMotion()
  const progress = useMotionValue(0)
  const dx = useMotionValue(0)
  const dy = useMotionValue(0)
  const shrink = useMotionValue(1)
  const crop = useMotionValue(0)
  // 1 when the card is off screen: the stage then fades in place rather than growing from it.
  const fade = useMotionValue(0)

  const x = useTransform([progress, dx], ([p, d]: number[]) => d * (1 - p))
  const y = useTransform([progress, dy], ([p, d]: number[]) => d * (1 - p))
  const scale = useTransform([progress, shrink], ([p, s]: number[]) => 1 + (s - 1) * (1 - p))
  const clipPath = useTransform([progress, shrink, crop], ([p, s, c]: number[]) => {
    if (p > 0.999 || (s === 1 && c === 0)) return 'none'
    const k = 1 - p
    return `inset(0px ${c * k}px round ${(CARD_RADIUS * k) / (1 + (s - 1) * k)}px)`
  })
  const opacity = useTransform([progress, fade], ([p, f]: number[]) => 1 - f * (1 - p))
  const scrim = useTransform(progress, [0, 1], [0, 1])
  // The list and controls follow the model in, rather than arriving with it.
  const chrome = useTransform(progress, [0.4, 1], [0, 1])
  const slide = useTransform(progress, [0.4, 1], [-14, 0])

  /** Where the card sits relative to the stage, as the transform that maps one onto the other. */
  const measure = () => {
    const card = cardSlot.current?.getBoundingClientRect()
    const stage = stageSlot.current?.getBoundingClientRect()
    if (!card || !stage || !card.height || !stage.height) return
    if (card.bottom < 0 || card.top > window.innerHeight) {
      dx.set(0)
      dy.set(0)
      shrink.set(0.94)
      crop.set(0)
      fade.set(1)
      return
    }
    fade.set(0)
    const s = card.height / stage.height
    dx.set(card.left + card.width / 2 - (stage.left + stage.width / 2))
    dy.set(card.top + card.height / 2 - (stage.top + stage.height / 2))
    shrink.set(s)
    crop.set(Math.max(0, (stage.width - card.width / s) / 2))
  }

  const run = (to: 0 | 1) => {
    goal.current = to
    const settle = () => {
      if (goal.current === 0 && progress.get() < 0.001) setOpen(false)
    }
    if (reduce) {
      progress.set(to)
      settle()
    } else {
      // A spring, so pressing close mid-way (or open again) turns the motion around from
      // where it is, at the speed it has.
      void animate(progress, to, EXPAND).then(settle)
    }
  }
  const expand = () => (open ? run(1) : setOpen(true))
  const collapse = () => {
    measure()
    run(0)
  }

  useLayoutEffect(() => {
    const d = dialog.current
    if (open) {
      if (d && !d.open) d.showModal()
      stageSlot.current?.appendChild(host)
      measure()
      run(1)
    } else {
      cardSlot.current?.appendChild(host)
      dx.set(0)
      dy.set(0)
      shrink.set(1)
      crop.set(0)
      fade.set(0)
      progress.set(0)
      if (d?.open) d.close()
    }
    // Runs only when the canvas changes homes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useImperativeHandle(ref, () => ({ expand }))

  const suitToggle = (
    <button
      type="button"
      aria-pressed={showSuit}
      onClick={() => setShowSuit((v) => !v)}
      className={`btn btn-sm border backdrop-blur-sm ${
        showSuit ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-ink-950/50 text-fg-muted hover:text-fg'
      }`}
    >
      {showSuit ? 'Suit on' : 'Suit off'}
    </button>
  )

  const summary = selected && (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={selected.region.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <SystemSummary assessment={selected} onClose={() => onSelect(null)} onTrend={onTrend} onLog={onLog} onDetails={onDetails} />
      </motion.div>
    </AnimatePresence>
  )

  return (
    <section
      id="body-systems"
      aria-label="Body model"
      className="relative h-72 scroll-mt-24 overflow-hidden rounded-xl border border-mist/12 bg-ink-950/45 backdrop-blur-md lg:h-[clamp(15rem,36svh,20rem)]"
      style={{ backgroundImage: 'radial-gradient(18rem 16rem at 50% 42%, rgb(42 157 143 / 0.2), transparent 70%)' }}
    >
      <div ref={cardSlot} className="absolute inset-0" />
      {webgl && (
        <button
          type="button"
          onClick={expand}
          aria-label="Open the body model full screen"
          className="group absolute inset-0 cursor-zoom-in rounded-xl focus-visible:-outline-offset-2"
        >
          <span className="absolute top-3 right-3 grid size-9 place-items-center rounded-md bg-ink-950/55 text-fg-muted backdrop-blur-sm transition-colors duration-150 group-hover:bg-ink-950/80 group-hover:text-fg">
            <Icon name="expand" className="size-4" />
          </span>
        </button>
      )}

      {createPortal(
        <motion.div
          style={{ x, y, scale, clipPath, opacity }}
          className={`model-fill absolute inset-0 ${webgl && !open ? 'pointer-events-none' : ''}`}
        >
          {webgl ? (
            <ModelBoundary fallback={<div className="size-full p-3">{flat}</div>}>
              <Suspense fallback={<div className="size-full p-3 opacity-60">{flat}</div>}>
                <BodyModel3D
                  regions={regions}
                  selectedId={selectedId}
                  showSuit={showSuit}
                  heartRate={heartRate}
                  interactive={open}
                  onSelect={toggle}
                />
              </Suspense>
            </ModelBoundary>
          ) : (
            <div className="size-full p-3">{flat}</div>
          )}
        </motion.div>,
        host,
      )}

      <dialog
        ref={dialog}
        aria-label="Body model"
        onCancel={(e) => {
          e.preventDefault()
          collapse()
        }}
        // The browser can close a dialog on its own (a second Escape); follow it.
        onClose={() => setOpen(false)}
        className="stage fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 text-fg"
      >
        {open && (
          <>
            <motion.div style={{ opacity: scrim }} className="absolute inset-0 bg-ink-950/92 backdrop-blur-md" />
            <motion.div
              style={{ opacity: chrome }}
              className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 flex gap-2 sm:right-6"
            >
              {suitToggle}
              <button type="button" onClick={collapse} className="btn btn-plain btn-sm size-8 p-0" aria-label="Close the full-screen model">
                <Icon name="collapse" className="size-4" />
              </button>
            </motion.div>
            <div className="relative flex h-full flex-col lg:flex-row">
              <div ref={stageSlot} className="relative min-h-0 flex-1 basis-1/2 cursor-grab active:cursor-grabbing lg:order-2" />
              <motion.div
                style={{ opacity: chrome, x: slide }}
                className="flex min-h-0 basis-1/2 flex-col gap-5 overflow-y-auto px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 lg:order-1 lg:w-[23rem] lg:shrink-0 lg:basis-auto lg:justify-center lg:px-8 lg:py-10"
              >
                <h2 className="display hidden text-5xl lg:block">
                  Your body<span className="text-accent">.</span>
                </h2>
                <SystemsNav regions={regions} selectedId={selectedId} onSelect={onSelect} pillId="stage-system" />
                {summary && (
                  <div className="border-t border-line pt-4" aria-live="polite">
                    {summary}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </dialog>
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
                className="group flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-mist/8"
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
