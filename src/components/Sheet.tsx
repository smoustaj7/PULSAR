import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Modal sheet on a native <dialog>: focus trap, Escape and backdrop dismissal come from the
 * platform. Docks to the bottom edge on phones and centers on larger screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  actions,
  size = 'md',
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Extra header controls, placed before the close button. */
  actions?: ReactNode
  size?: 'md' | 'lg'
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Click on the backdrop (the dialog element itself, outside the panel) dismisses.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby={titleId}
      className={`sheet fixed inset-x-0 bottom-0 m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-line bg-navy-900 p-0 text-fg shadow-2xl sm:inset-0 sm:m-auto sm:rounded-3xl ${
        size === 'lg' ? 'sm:w-[min(56rem,calc(100vw-2rem))]' : 'sm:w-[min(32rem,calc(100vw-2rem))]'
      }`}
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden />
        <header className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          {actions}
          <button type="button" onClick={onClose} className="btn btn-plain size-9 min-h-0 shrink-0 p-0" aria-label="Close">
            <Icon name="close" className="size-4.5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">{children}</div>
      </div>
    </dialog>
  )
}
