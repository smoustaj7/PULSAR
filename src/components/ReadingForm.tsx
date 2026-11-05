import { useState, type FormEvent } from 'react'
import { config, indicatorsById } from '../config'
import { evaluateValue } from '../engine/rules'
import { useHealthStore } from '../store/useHealthStore'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'

/** Local datetime string for <input type="datetime-local">. */
const toLocalInput = (t: number) => {
  const d = new Date(t)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function ReadingForm({ indicatorId, onIndicatorChange }: { indicatorId: string; onIndicatorChange: (id: string) => void }) {
  const addReading = useHealthStore((s) => s.addReading)
  const [value, setValue] = useState('')
  const [when, setWhen] = useState(() => toLocalInput(Date.now()))
  const [note, setNote] = useState('')

  const indicator = indicatorsById[indicatorId]
  const num = value === '' ? Number.NaN : Number(value)
  const preview = Number.isFinite(num) ? evaluateValue(indicator, num) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!Number.isFinite(num)) return
    addReading({ indicatorId, value: num, timestamp: new Date(when).getTime(), note: note || undefined })
    setValue('')
    setNote('')
    setWhen(toLocalInput(Date.now()))
  }

  const field = 'w-full rounded-lg border border-white/10 bg-space-800 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none'

  return (
    <Card title="Log a reading">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs text-slate-400">
          Indicator
          <select value={indicatorId} onChange={(e) => onIndicatorChange(e.target.value)} className={`${field} mt-1`}>
            {config.indicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label} ({i.unit})
              </option>
            ))}
          </select>
        </label>

        <p className="rounded-lg bg-space-800/60 p-2.5 text-xs text-slate-300">
          <span className="font-semibold text-sky-300">How to measure: </span>
          {indicator.howToMeasure}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-400">
            Value ({indicator.unit})
            <input
              type="number"
              inputMode="decimal"
              required
              min={indicator.input.min}
              max={indicator.input.max}
              step={indicator.input.step}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`${field} mt-1 font-mono`}
            />
          </label>
          <label className="block text-xs text-slate-400">
            Time
            <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={`${field} mt-1`} />
          </label>
        </div>

        <label className="block text-xs text-slate-400">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after a treadmill session" className={`${field} mt-1`} />
        </label>

        {preview && (
          <div className="flex items-start gap-2 text-xs">
            <StatusBadge status={preview.status} className="shrink-0" />
            <span className="text-slate-300">{preview.guidance}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!preview}
          className="w-full rounded-lg bg-sky-500 py-2 text-sm font-semibold text-space-950 transition hover:bg-sky-400 disabled:opacity-40"
        >
          Save reading
        </button>
      </form>
    </Card>
  )
}
