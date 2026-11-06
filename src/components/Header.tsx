import { config } from '../config'
import type { EnvironmentConfig, Status } from '../engine/types'
import { STATUS_META } from '../lib/status'
import { useHealthStore } from '../store/useHealthStore'

const HEADLINE: Record<Status, string> = {
  nominal: 'All systems nominal',
  caution: 'Some indicators need attention',
  critical: 'Action required: follow the guidance and escalate',
  unknown: 'Log your first readings to get a status',
}

export function Header({ status, now, environment }: { status: Status; now: number; environment: EnvironmentConfig }) {
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
            value={environment.id}
            onChange={(e) => updateMission({ environmentId: e.target.value })}
            className="rounded-lg border border-white/10 bg-space-800 px-2 py-1"
          >
            {config.environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.label}
              </option>
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

      <div className={`rounded-xl border px-4 py-2.5 ${m.bg} ${m.border}`} role="status">
        <div className="flex items-center gap-3">
          <span className={`size-3 shrink-0 rounded-full ${m.dot} ${status === 'critical' ? 'animate-pulse' : ''}`} />
          <span className={`font-medium ${m.text}`}>{HEADLINE[status]}</span>
        </div>
        {status === 'critical' && <p className="mt-1 pl-6 text-sm text-slate-200">{environment.escalation}</p>}
      </div>

      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <ContextItem label="Gravity" value={environment.gravity} />
        <ContextItem label="Comms delay to Earth" value={environment.commsDelay} />
        <ContextItem label="Medical support" value={environment.support} />
      </dl>
    </header>
  )
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-space-900/60 px-3 py-2">
      <dt className="text-[10px] tracking-wider text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-slate-300">{value}</dd>
    </div>
  )
}
