import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useToastStore } from '../store/useToastStore'

const SHOW_MS = 5000

/** Confirms an action and offers a single follow-up (usually Undo). Sits above the tab bar. */
export function Toaster() {
  const toast = useToastStore((s) => s.toast)
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(dismiss, SHOW_MS)
    return () => clearTimeout(id)
  }, [toast, dismiss])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-ink-900/95 py-2 pr-2 pl-4 text-sm shadow-2xl backdrop-blur"
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="btn btn-tinted btn-sm"
                onClick={() => {
                  toast.action!.run()
                  dismiss()
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
