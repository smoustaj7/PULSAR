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
            {title && <SectionTitle>{title}</SectionTitle>}
            {subtitle && <p className="mt-1 text-xs text-fg-subtle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/** A card or section title: condensed caps, one step above body copy. */
export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-display text-xl leading-none font-semibold tracking-[0.015em] text-fg uppercase">
      {children}
    </h2>
  )
}

/** Title block at the top of a view: a masthead ending in the accent's full stop. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="display text-[clamp(2.75rem,7vw,4.75rem)] text-fg">
        {title}
        <span className="text-accent">.</span>
      </h1>
      {children && <p className="mt-3 max-w-2xl text-[15px] text-fg-muted">{children}</p>}
    </div>
  )
}
