import type { ReactNode } from 'react'

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  id,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`surface p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/** Title block at the top of a view. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">{title}</h1>
      {children && <p className="mt-1 max-w-2xl text-[15px] text-fg-muted">{children}</p>}
    </div>
  )
}
