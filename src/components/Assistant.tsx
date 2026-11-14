import { motion } from 'framer-motion'
import { Suspense, lazy, useEffect, useState } from 'react'
import { Icon } from './Icon'

// The chat and its Markdown renderer load the first time it opens, not with the dashboard.
const Chat = lazy(() => import('./chat'))

const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const

/**
 * The health assistant's way in: a round button at the bottom right, and the chat it opens,
 * growing out of that corner (full screen on phones). Once opened the chat stays mounted, so
 * closing and reopening keeps the conversation.
 */
export function Assistant({ metrics }: { metrics: string }) {
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const show = () => {
    setOpened(true)
    setOpen(true)
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={show}
        aria-label="Ask Dr.Jarvis, the AI health assistant"
        aria-expanded={open}
        initial={false}
        animate={open ? { scale: 0.6, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={SPRING}
        className={`fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-12 items-center gap-2 rounded-full bg-accent pr-5 pl-4 font-display text-[15px] font-semibold text-ink-950 shadow-[0_12px_32px_-8px_rgb(1_10_13/0.8)] transition-colors duration-150 hover:bg-mist active:scale-[0.97] md:right-6 md:bottom-6 ${
          open ? 'pointer-events-none' : ''
        }`}
      >
        <Icon name="chat" className="size-5" />
        Ask
      </motion.button>

      {opened && (
        <motion.div
          role="dialog"
          aria-label="Dr.Jarvis, AI health assistant"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={
            open
              ? { opacity: 1, scale: 1, visibility: 'visible' }
              : { opacity: 0, scale: 0.92, transitionEnd: { visibility: 'hidden' } }
          }
          transition={SPRING}
          style={{ transformOrigin: 'bottom right' }}
          className="fixed inset-0 z-50 overflow-hidden border-line bg-ink-900 shadow-2xl md:inset-auto md:right-6 md:bottom-6 md:h-[min(640px,calc(100svh-7rem))] md:w-[400px] md:rounded-2xl md:border"
        >
          <Suspense
            fallback={
              <div className="grid h-full place-items-center">
                <span className="size-6 rounded-full border-2 border-mist/15 border-t-accent motion-safe:animate-spin" />
              </div>
            }
          >
            <Chat metrics={metrics} onClose={() => setOpen(false)} />
          </Suspense>
        </motion.div>
      )}
    </>
  )
}
