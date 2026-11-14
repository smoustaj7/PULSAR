import { sourceDetail, sourceHref, type Source } from '../lib/citations'
import { Icon } from './Icon'

const CHIP = 'inline-grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-md bg-accent/15 px-1 text-[10px] font-semibold text-accent tabular-nums'

/**
 * A citation inside the answer: the source's number, opening the source where the passage is.
 * Plain inline text rather than a box, so a line never breaks between it and the word or the
 * full stop beside it.
 */
export function CitationChip({ source }: { source: Source }) {
  return (
    <a
      href={sourceHref(source)}
      target="_blank"
      rel="noreferrer"
      title={source.title}
      aria-label={`Source ${source.n}: ${source.title} (opens in a new tab)`}
      className="ml-[0.25em] rounded-[5px] bg-accent/15 px-[0.4em] py-[0.15em] align-[0.12em] text-[10px] leading-none font-semibold text-accent tabular-nums no-underline transition-colors duration-100 ease-out hover:bg-accent/25 focus-visible:outline-2 focus-visible:outline-accent active:bg-accent/35"
    >
      {source.n}
    </a>
  )
}

/** The NASA documents behind an answer, numbered like the chips in it, each opening the document. */
export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-3 border-t border-line pt-2.5">
      <p className="text-[11px] font-medium tracking-[0.06em] text-fg-subtle uppercase">Sources</p>
      <ol className="mt-1 space-y-0.5" aria-label="Sources">
        {sources.map((s) => (
          <li key={s.n}>
            <a
              href={sourceHref(s)}
              target="_blank"
              rel="noreferrer"
              className="group -mx-2 flex items-start gap-2 rounded-xl px-2 py-1.5 transition-[background-color,transform] duration-100 ease-out hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent active:scale-[0.99] motion-reduce:active:scale-100"
            >
              <span className={`${CHIP} mt-px shrink-0`} aria-hidden>
                {s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-xs leading-snug text-fg group-hover:underline">{s.title}</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-fg-subtle">{sourceDetail(s)}</span>
              </span>
              <Icon name="external" className="mt-0.5 size-3.5 shrink-0 text-fg-subtle transition-colors group-hover:text-accent" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
