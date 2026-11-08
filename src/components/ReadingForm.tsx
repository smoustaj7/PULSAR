import { useEffect, useRef, useState, type FormEvent } from 'react'
import { evaluateValue } from '../engine/rules'
import { STATUS_META, formatRange } from '../lib/status'
import { useActiveConfig } from '../lib/useActiveConfig'
import { useHealthStore } from '../store/useHealthStore'
import { useToastStore } from '../store/useToastStore'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { StatusBadge } from './StatusBadge'

/** Local datetime string for <input type="datetime-local">. */
const toLocalInput = (t: number) => {
  const d = new Date(t)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/** Log one measurement. Shows how to take it, then previews the status while you type. */
export function LogReadingSheet({
  open,
  onClose,
  indicatorId,
  onIndicatorChange,
}: {
  open: boolean
  onClose: () => void
  indicatorId: string
  onIndicatorChange: (id: string) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Log a reading" description="Saved on this device. Your status updates right away.">
      {/* Mounted only while open, so every visit starts with an empty form and the current time. */}
      {open && <LogForm indicatorId={indicatorId} onIndicatorChange={onIndicatorChange} onDone={onClose} />}
    </Sheet>
  )
}

function LogForm({
  indicatorId,
  onIndicatorChange,
  onDone,
}: {
  indicatorId: string
  onIndicatorChange: (id: string) => void
  onDone: () => void
}) {
  const addReading = useHealthStore((s) => s.addReading)
  const removeReading = useHealthStore((s) => s.removeReading)
  const showToast = useToastStore((s) => s.show)
  const { config, indicatorsById } = useActiveConfig()
  const [value, setValue] = useState('')
  const [when, setWhen] = useState(() => toLocalInput(Date.now()))
  const [note, setNote] = useState('')
  const valueRef = useRef<HTMLInputElement>(null)

  // Focus the value once the dialog is shown (the sheet opens it after this mounts).
  useEffect(() => {
    const id = requestAnimationFrame(() => valueRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  const indicator = indicatorsById[indicatorId]
  const num = value === '' ? Number.NaN : Number(value)
  const { min, max } = indicator.input
  // Values outside what the sensor can plausibly report are typos, not health events.
  const implausible = Number.isFinite(num) && (num < min || num > max)
  const preview = Number.isFinite(num) && !implausible ? evaluateValue(indicator, num) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!preview) return
    const id = addReading({ indicatorId, value: num, timestamp: new Date(when).getTime(), note: note.trim() || undefined })
    showToast({
      message: `Saved: ${indicator.label} ${num} ${indicator.unit} · ${STATUS_META[preview.status].label}`,
      action: { label: 'Undo', run: () => removeReading(id) },
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-fg-muted">
        What did you measure?
        <select value={indicatorId} onChange={(e) => onIndicatorChange(e.target.value)} className="field mt-1.5">
          {config.indicators.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label} ({i.unit})
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3 rounded-2xl bg-accent/8 p-3 text-sm">
        <Icon name="info" className="mt-0.5 size-4.5 shrink-0 text-accent" />
        <div>
          <p className="text-fg">{indicator.howToMeasure}</p>
          <p className="mt-1 text-xs text-fg-subtle">Normal range: {formatRange(indicator)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-fg-muted">
          Value
          <span className="relative mt-1.5 block">
            <input
              ref={valueRef}
              type="number"
              inputMode="decimal"
              required
              min={min}
              max={max}
              step={indicator.input.step}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="field pr-16 text-lg font-semibold tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-fg-subtle">
              {indicator.unit}
            </span>
          </span>
        </label>
        <label className="block text-sm text-fg-muted">
          When
          <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className="field mt-1.5 py-3" />
        </label>
      </div>

      <label className="block text-sm text-fg-muted">
        Note <span className="text-fg-subtle">(optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after a treadmill session" className="field mt-1.5" />
      </label>

      <div aria-live="polite" className="min-h-12">
        {implausible && (
          <p className="flex items-center gap-2 rounded-2xl bg-white/4 p-3 text-sm text-fg">
            <Icon name="info" className="size-4.5 shrink-0 text-accent" />
            Enter a value between {min} and {max} {indicator.unit}.
          </p>
        )}
        {preview && (
          <div className={`flex items-start gap-2.5 rounded-2xl border p-3 text-sm ${STATUS_META[preview.status].border} ${STATUS_META[preview.status].bg}`}>
            <StatusBadge status={preview.status} className="shrink-0" />
            <span className="text-fg">{preview.guidance}</span>
          </div>
        )}
      </div>

      <button type="submit" disabled={!preview} className="btn btn-primary min-h-12 w-full text-base">
        Save reading
      </button>
    </form>
  )
}
