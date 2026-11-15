import { useEffect, useRef, useState } from 'react'
import { INJURY_KINDS, injuryLabel, type InjuryKind } from '../lib/bodyPlace'
import { timeAgo } from '../lib/status'
import type { Injury } from '../store/useHealthStore'
import { Icon } from './Icon'

/** A spot tapped on the skin, waiting to be saved as an injury. */
export interface InjuryDraft {
  place: string
  point: [number, number, number]
  normal: [number, number, number]
}

/**
 * Injuries on the skin: mark one by tapping the body where it is, and it stays on the model
 * until it has healed. Three states, one at a time: the list with a way to add; "tap the
 * body"; and, once a spot is tapped, what kind of injury it is.
 */
export function Injuries({
  injuries,
  now,
  placing,
  draft,
  activeId,
  onStart,
  onCancel,
  onSave,
  onShow,
  onHealed,
}: {
  injuries: Injury[]
  now: number
  /** The body is waiting for a tap. */
  placing: boolean
  draft: InjuryDraft | null
  /** The injury the model is turned to, if any. */
  activeId: string | null
  onStart: () => void
  onCancel: () => void
  onSave: (kind: InjuryKind, note: string) => void
  /** Turn the model to an injury (or away, when it is already the one in view). */
  onShow: (id: string) => void
  onHealed: (injury: Injury) => void
}) {
  const [kind, setKind] = useState<InjuryKind>('scratch')
  const [note, setNote] = useState('')
  // The steps open at the foot of a list that may be scrolled away from them; bring them into
  // view, so the tap on the body is answered where the eye can find it.
  const section = useRef<HTMLElement>(null)
  useEffect(() => {
    if (placing) section.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [placing, draft])
  const save = () => {
    onSave(kind, note.trim())
    setNote('')
    setKind('scratch')
  }

  return (
    <section ref={section} aria-labelledby="injuries-title" className="border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3 px-3">
        <h3 id="injuries-title" className="text-xs font-medium tracking-wider text-fg-subtle uppercase">
          Injuries{injuries.length > 0 && <span className="ml-1.5 tabular-nums">{injuries.length}</span>}
        </h3>
        {!placing && (
          <button type="button" onClick={onStart} className="btn btn-tinted btn-sm">
            <Icon name="plus" className="size-3.5" /> Mark an injury
          </button>
        )}
      </div>

      {placing && !draft && (
        <div role="status" className="mx-3 mt-3 rounded-xl border border-accent/35 bg-accent/8 p-3.5">
          <p className="text-sm font-medium text-fg">Tap the spot on the body</p>
          <p className="mt-1 text-[13px] text-fg-muted">Drag to turn the model first if it’s on your back or side.</p>
          <button type="button" onClick={onCancel} className="btn btn-plain btn-sm mt-3">
            Cancel
          </button>
        </div>
      )}

      {placing && draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="mx-3 mt-3 rounded-xl border border-accent/35 bg-accent/8 p-3.5"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-[#ff4d5e]" />
            {draft.place}
          </p>
          <p className="mt-1 text-[13px] text-fg-muted">Tap the body again to move it.</p>
          <div role="radiogroup" aria-label="Kind of injury" className="mt-3 flex flex-wrap gap-1.5">
            {INJURY_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`h-8 rounded-full border px-3 text-[13px] transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] ${
                  kind === k.id ? 'border-accent bg-accent/15 text-fg' : 'border-line text-fg-muted hover:border-mist/30 hover:text-fg'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            aria-label="Note (optional)"
            placeholder="Note (optional), e.g. caught on a panel"
            className="field mt-3"
          />
          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
            <button type="button" onClick={onCancel} className="btn btn-plain btn-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {injuries.length === 0 && !placing && (
        <p className="mt-2 px-3 text-[13px] text-fg-subtle">Got a scratch, cut or bruise? Mark it on the body and it stays on your model, and in your report to ground, until it heals.</p>
      )}

      {injuries.length > 0 && (
        <ul className="mt-2">
          {injuries.map((i) => (
            <li key={i.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={activeId === i.id}
                onClick={() => onShow(i.id)}
                title="Show on the body"
                className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 text-left transition-colors duration-150 hover:bg-mist/8 ${
                  activeId === i.id ? 'bg-mist/10' : ''
                }`}
              >
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-[#ff4d5e]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {injuryLabel(i.kind)} · {i.place}
                  </span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {timeAgo(i.timestamp, now)}
                    {i.note && ` · ${i.note}`}
                  </span>
                </span>
              </button>
              <button type="button" onClick={() => onHealed(i)} className="btn btn-plain btn-sm shrink-0" title="Remove it from the body and the report">
                Healed
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
