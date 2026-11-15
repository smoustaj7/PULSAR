import { SectionTitle } from '../components/Card'
import { CycleCard } from '../components/CycleCard'
import { EarthLinkCard } from '../components/EarthLinkCard'
import type { Cycle } from '../engine/cycle'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { MissionProgress } from '../components/MissionProgress'
import { RadiationCard } from '../components/RadiationCard'
import type { RadiationState } from '../engine/radiation'
import { TodayCard } from '../components/TodayCard'
import type { Progress } from '../engine/gamification'
import type { DueItem, Evaluation } from '../engine/types'

/**
 * Below the hero (where the body model lives) the dashboard reads in two rows on wide
 * screens: the day (what to log, and how the streak stands) side by side, then the cycle for
 * crew who track one, the radiation dose, and every reading across the full width. The
 * progress column lines up under the body model. On phones it is one column: today, cycle,
 * radiation, readings, then progress.
 */
export function OverviewView({
  evaluations,
  due,
  progress,
  now,
  missionDay,
  selectedIndicatorId,
  onPickIndicator,
  onLog,
  onOpenRequirement,
  onOpenPlan,
  cycle,
  radiation,
  earthLink,
}: {
  evaluations: Evaluation[]
  due: DueItem[]
  progress: Progress
  now: number
  missionDay: number
  selectedIndicatorId: string
  onPickIndicator: (id: string) => void
  onLog: (indicatorId?: string) => void
  onOpenRequirement: (requirementId: string) => void
  onOpenPlan: () => void
  /** Shown as its own card when given. */
  cycle?: Cycle
  /** The dose so far and the time left before each of NASA's limits. */
  radiation: { state: RadiationState; environmentLabel: string }
  /** Given when the link to Earth leads the dashboard (far from Earth, or a report sent). */
  earthLink?: { environmentId: string; onSendReport: () => void }
}) {
  return (
    <div className="grid gap-6 lg:gap-8">
    {earthLink && <EarthLinkCard environmentId={earthLink.environmentId} missionDay={missionDay} onReport={earthLink.onSendReport} />}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="lg:col-start-1 lg:row-start-1">
        <TodayCard
          due={due}
          progress={progress}
          missionDay={missionDay}
          now={now}
          onLog={onLog}
          onOpenRequirement={onOpenRequirement}
          onOpenPlan={onOpenPlan}
        />
      </div>

      {/* The full-width rows below fill in after the first, in this order. */}
      {cycle && (
        <div className="lg:col-span-2">
          <CycleCard cycle={cycle} now={now} />
        </div>
      )}

      <div className="lg:col-span-2">
        <RadiationCard state={radiation.state} environmentLabel={radiation.environmentLabel} missionDay={missionDay} now={now} onLog={onLog} />
      </div>

      <section className="@container lg:col-span-2" aria-labelledby="readings-title">
        <div className="mb-3 px-1">
          <SectionTitle id="readings-title">Your readings</SectionTitle>
        </div>
        <IndicatorGrid evaluations={evaluations} selectedId={selectedIndicatorId} onSelect={onPickIndicator} now={now} />
      </section>

      <div className="lg:col-start-2 lg:row-start-1">
        <MissionProgress progress={progress} />
      </div>
    </div>
    </div>
  )
}
