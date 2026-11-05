import type { Status } from '../engine/types'
import { STATUS_META } from '../lib/status'
import { ENVIRONMENTS, useHealthStore, type Environment } from '../store/useHealthStore'

const HEADLINE: Record<Status, string> = {
  nominal: 'All systems nominal',
  caution: 'Some indicators need attention',
  critical: 'Action required: contact the CMO / flight surgeon',
  unknown: 'Log your first readings to get a status',
}

export function Header({ status, now }: { status: Status; now: number }) {
  const mission = useHealthStore((s) => s.mission)
  const updateMission = useHealthStore((s) => s.updateMission)
  const loadDemoData = useHealthStore((s) => s.loadDemoData)
  const clearReadings = useHealthStore((s) => s.clearReadings)
  const missionDay = Math.max(1, Math.floor((now - mission.missionStart) / 86_400_000) + 1)
  const m = STATUS_META[status]

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Astro<span className="text-sky-400">Pulse</span>
          </h1>
          <p className="text-xs text-slate-400">Crew self-assessment · Mission day {missionDay}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            aria-label="Crew member name"
            value={mission.crewName}
            onChange={(e) => updateMission({ crewName: e.target.value })}
            className="w-36 rounded-lg border border-white/10 bg-space-800 px-2 py-1"
          />
          <select
            aria-label="Mission environment"
            value={mission.environment}
            onChange={(e) => updateMission({ environment: e.target.value as Environment })}
            className="rounded-lg border border-white/10 bg-space-800 px-2 py-1"
          >
            {ENVIRONMENTS.map((env) => (
              <option key={env}>{env}</option>
            ))}
          </select>
          <button type="button" onClick={loadDemoData} className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/5">
            Load demo data
          </button>
          <button type="button" onClick={clearReadings} className="rounded-lg border border-white/10 px-2 py-1 text-slate-400 hover:bg-white/5">
            Clear
          </button>
        </div>
      </div>

      <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${m.bg} ${m.border}`} role="status">
        <span className={`size-3 rounded-full ${m.dot} ${status === 'critical' ? 'animate-pulse' : ''}`} />
        <span className={`font-medium ${m.text}`}>{HEADLINE[status]}</span>
      </div>
    </header>
  )
}
