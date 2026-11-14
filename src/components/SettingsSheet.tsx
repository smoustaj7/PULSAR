import { config } from '../config'
import { useDemoMode } from '../lib/useDemoMode'
import { useAccountStore } from '../store/useAccountStore'
import { useHealthStore, type Sex } from '../store/useHealthStore'
import { useToastStore } from '../store/useToastStore'
import { Sheet } from './Sheet'

const toDateInput = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SEXES: { id: Sex; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'unspecified', label: 'Prefer not to say' },
]

/** Who, where and since when: the settings that change how readings are judged. */
export function SettingsSheet({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour: () => void }) {
  const mission = useHealthStore((s) => s.mission)
  const readings = useHealthStore((s) => s.readings)
  const updateMission = useHealthStore((s) => s.updateMission)
  const replaceReadings = useHealthStore((s) => s.replaceReadings)
  const showToast = useToastStore((s) => s.show)
  const demo = useDemoMode()
  const activeId = useAccountStore((s) => s.activeId)
  const rename = useAccountStore((s) => s.rename)
  const signOut = useAccountStore((s) => s.signOut)
  const remove = useAccountStore((s) => s.remove)

  // Clearing replaces the log, so it is undoable instead of asking for confirmation.
  const clearAll = () => {
    const before = readings
    replaceReadings([])
    showToast({ message: `Cleared ${before.length} readings`, action: { label: 'Undo', run: () => replaceReadings(before) } })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Mission settings" description="Thresholds and escalation advice follow your environment.">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-fg-muted">
            Crew member
            <input
              value={mission.crewName}
              onChange={(e) => {
                updateMission({ crewName: e.target.value })
                if (activeId) rename(activeId, e.target.value)
              }}
              autoComplete="off"
              className="field mt-1.5"
            />
          </label>
          <label className="block text-sm text-fg-muted">
            Mission day 1
            <input
              type="date"
              value={toDateInput(mission.missionStart)}
              onChange={(e) => {
                const t = new Date(`${e.target.value}T00:00`).getTime()
                if (Number.isFinite(t)) updateMission({ missionStart: t })
              }}
              className="field mt-1.5"
            />
          </label>
        </div>

        <fieldset>
          <legend className="text-sm text-fg-muted">Sex</legend>
          <p className="mt-0.5 text-xs text-fg-subtle">Spaceflight affects female and male bodies differently; Dr.Jarvis takes it into account.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEXES.map((option) => {
              const checked = (mission.sex ?? 'unspecified') === option.id
              return (
                <label
                  key={option.id}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
                    checked ? 'border-accent/60 bg-accent/8 text-fg' : 'border-line text-fg-muted hover:bg-white/4'
                  }`}
                >
                  <input
                    type="radio"
                    name="sex"
                    value={option.id}
                    checked={checked}
                    onChange={() => updateMission({ sex: option.id })}
                    className="size-4 accent-[var(--accent)]"
                  />
                  {option.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm text-fg-muted">Where are you?</legend>
          <div className="mt-1.5 space-y-2">
            {config.environments.map((env) => {
              const checked = env.id === mission.environmentId
              return (
                <label
                  key={env.id}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition-colors ${
                    checked ? 'border-accent/60 bg-accent/8' : 'border-line hover:bg-white/4'
                  }`}
                >
                  <input
                    type="radio"
                    name="environment"
                    value={env.id}
                    checked={checked}
                    onChange={() => updateMission({ environmentId: env.id })}
                    className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{env.label}</span>
                    <span className="block text-xs text-fg-subtle">
                      {env.gravity} · Comms: {env.commsDelay}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div>
          <div className="text-sm text-fg-muted">Readings on this device</div>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {demo.active
              ? 'Showing a demo astronaut’s readings, sex and mission in place of your own. Exit the demo to put yours back.'
              : `${readings.length} saved. Everything stays in this browser; nothing is uploaded.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {demo.active ? (
              <>
                {demo.showing && (
                  <button type="button" className="btn btn-tinted" onClick={() => demo.enter(demo.showing === 'female' ? 'male' : 'female')}>
                    Switch to the {demo.showing === 'female' ? 'male' : 'female'} demo
                  </button>
                )}
                <button type="button" className="btn btn-plain" onClick={demo.exit}>
                  Exit demo
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-tinted" onClick={() => demo.enter('female')}>
                  Female demo
                </button>
                <button type="button" className="btn btn-tinted" onClick={() => demo.enter('male')}>
                  Male demo
                </button>
                <button type="button" className="btn btn-plain text-critical" disabled={readings.length === 0} onClick={clearAll}>
                  Clear all readings
                </button>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <div className="text-sm text-fg-muted">Profile</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-plain" onClick={onTour}>
              Show the app tour
            </button>
            <button type="button" className="btn btn-plain" onClick={signOut}>
              Switch astronaut
            </button>
            <button
              type="button"
              className="btn btn-plain text-critical"
              onClick={() => {
                if (!activeId) return
                const undo = remove(activeId)
                showToast({ message: `Deleted ${mission.crewName}’s profile`, action: { label: 'Undo', run: undo } })
              }}
            >
              Delete profile
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
