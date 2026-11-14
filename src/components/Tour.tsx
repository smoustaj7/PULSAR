import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TourStep } from '../lib/tour'
import { Icon } from './Icon'

/** Room around the control inside the spotlight, between the spotlight and the card, and at the screen's edges. */
const PAD = 8
const GAP = 14
const EDGE = 16
/** Critically damped: the spotlight glides to the next control and settles without bouncing. */
const SPRING = { type: 'spring', bounce: 0, duration: 0.45 } as const

/** The control a step points at, if it is on screen in this layout. */
const findTarget = (name: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  )

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight })

/** Whether the control stays put when the page scrolls (the top bar, the tab bar, Ask). */
const pinned = (el: HTMLElement | null): boolean => {
  for (let node = el; node; node = node.parentElement) {
    const { position } = getComputedStyle(node)
    if (position === 'fixed' || position === 'sticky') return true
  }
  return false
}

/** Below the top bar. */
const TOP = 88

/**
 * A first-run tour, like a game's: the screen dims, a spotlight shows one control at a time,
 * and a card beside it says what the control is for. The spotlight glides from control to
 * control, so each new one is seen in relation to the last. Arrow keys step through it and
 * Escape skips it; the controls underneath can't be pressed until it ends.
 */
export function Tour({ steps, onClose, lastLabel = 'Let’s go' }: { steps: TourStep[]; onClose: () => void; lastLabel?: string }) {
  const reduce = useReducedMotion()
  // Only the steps whose control is on screen now: phones and desktops show different ones.
  const [shown] = useState(() => steps.filter((s) => !s.target || findTarget(s.target)))
  const [index, setIndex] = useState(0)
  const step = shown[index]
  const last = index === shown.length - 1
  const [measured, setRect] = useState<DOMRect | null>(null)
  // A step without a control ignores where the last one was.
  const rect = step?.target ? measured : null
  const [view, setView] = useState(viewport)
  const [cardHeight, setCardHeight] = useState(220)
  // The same, for the scroll in the effect below, which shouldn't rerun when it changes.
  const cardHeightNow = useRef(cardHeight)
  const card = useRef<HTMLDivElement>(null)
  const next = useRef<HTMLButtonElement>(null)

  // Bring the control into view, then follow it each frame: it may still be scrolling there,
  // animating in, or moving with a resize.
  useEffect(() => {
    const el = step?.target ? findTarget(step.target) : undefined
    if (!el) return
    // Scroll the control into view unless it and the card already fit. With room for both,
    // the control goes just under the top bar and the card beneath it; otherwise it's centred.
    if (!pinned(el)) {
      const r = el.getBoundingClientRect()
      const below = GAP + cardHeightNow.current + EDGE
      if (r.top < TOP || r.bottom + below > window.innerHeight) {
        const by = TOP + r.height + below <= window.innerHeight ? r.top - TOP : r.top + r.height / 2 - window.innerHeight / 2
        window.scrollBy({ top: by, behavior: reduce ? 'auto' : 'smooth' })
      }
    }
    let frame = 0
    let seen = ''
    const follow = () => {
      const now = el.getBoundingClientRect()
      const key = `${Math.round(now.left)},${Math.round(now.top)},${Math.round(now.width)},${Math.round(now.height)}`
      if (key !== seen) {
        seen = key
        setRect(now)
      }
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [step, reduce])

  useEffect(() => {
    const onResize = () => setView(viewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // The card's height decides whether it fits above the control.
  useEffect(() => {
    if (!card.current) return
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
      cardHeightNow.current = height
      setCardHeight(height)
    })
    observer.observe(card.current)
    return () => observer.disconnect()
  }, [])

  // Focus follows the tour, so Enter moves on and a screen reader hears each step.
  useEffect(() => next.current?.focus({ preventScroll: true }), [index])

  const go = (to: number) => (to >= shown.length ? onClose() : setIndex(Math.max(0, to)))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setIndex((i) => (i + 1 < shown.length ? i + 1 : i))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, shown.length])

  if (!step) return null

  // The spotlight: around the control, or shrunk to the middle when the step has none.
  const hole = rect
    ? { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { left: view.w / 2, top: view.h / 2, width: 0, height: 0 }
  // The card: under the control if it fits, else above it, else beside it (a tall control
  // like the body model), else at the foot of the screen.
  const cardWidth = Math.min(360, view.w - EDGE * 2)
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))
  const centred = (v: number) => clamp(v, EDGE, view.w - EDGE - cardWidth)
  const below = hole.top + hole.height + GAP
  const above = hole.top - GAP - cardHeight
  const besideTop = clamp(hole.top + hole.height / 2 - cardHeight / 2, EDGE, view.h - EDGE - cardHeight)
  const leftOf = hole.left - GAP - cardWidth
  const rightOf = hole.left + hole.width + GAP
  const [top, left] = !rect
    ? [(view.h - cardHeight) / 2, (view.w - cardWidth) / 2]
    : below + cardHeight <= view.h - EDGE
      ? [below, centred(rect.left + rect.width / 2 - cardWidth / 2)]
      : above >= EDGE
        ? [above, centred(rect.left + rect.width / 2 - cardWidth / 2)]
        : leftOf >= EDGE
          ? [besideTop, leftOf]
          : rightOf + cardWidth <= view.w - EDGE
            ? [besideTop, rightOf]
            : [view.h - EDGE - cardHeight, centred(rect.left + rect.width / 2 - cardWidth / 2)]
  const move = reduce ? { duration: 0 } : SPRING

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* Holds the controls underneath still until the tour ends. */}
      <div className="absolute inset-0" aria-hidden />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed rounded-[14px]"
        initial={false}
        animate={hole}
        transition={move}
        style={{
          boxShadow: rect
            ? '0 0 0 2px var(--accent), 0 0 28px 6px rgb(42 157 143 / 0.35), 0 0 0 200vmax rgb(1 10 13 / 0.74)'
            : '0 0 0 200vmax rgb(1 10 13 / 0.74)',
        }}
      >
        {rect && !reduce && (
          <motion.span
            className="absolute -inset-1 rounded-[17px] border-2 border-accent"
            animate={{ opacity: [0.7, 0], scale: [1, 1.06] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </motion.div>

      <motion.div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed rounded-2xl border border-line bg-ink-900/95 p-5 shadow-[0_24px_60px_-12px_rgb(1_10_13/0.9)] backdrop-blur-xl"
        style={{ width: cardWidth }}
        initial={reduce ? { opacity: 0, left, top } : { opacity: 0, left, top: top + 12 }}
        animate={{ opacity: 1, left, top }}
        transition={move}
      >
        <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.2 }}>
          <div className="flex items-center justify-between gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent" aria-hidden>
              <Icon name={step.icon} className="size-5" />
            </span>
            <span className="text-xs font-medium text-fg-subtle tabular-nums">
              {index + 1} of {shown.length}
            </span>
          </div>
          <h2 id="tour-title" className="mt-3.5 font-display text-lg font-semibold text-fg">
            {step.title}
          </h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-fg-muted">
            {step.body}
          </p>
        </motion.div>

        {/* Where you are in the tour. */}
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {shown.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === index ? 'w-5 bg-accent' : i < index ? 'w-1.5 bg-accent/50' : 'w-1.5 bg-mist/20'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {!last && (
            <button type="button" onClick={onClose} className="mr-auto text-sm text-fg-subtle transition-colors hover:text-fg">
              Skip tour
            </button>
          )}
          {index > 0 && (
            <button type="button" onClick={() => go(index - 1)} className={`btn btn-plain min-h-10 px-4 ${last ? 'mr-auto' : ''}`}>
              Back
            </button>
          )}
          <button ref={next} type="button" onClick={() => go(index + 1)} className="btn btn-primary min-h-10 px-5">
            {index === 0 ? 'Show me' : last ? lastLabel : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
