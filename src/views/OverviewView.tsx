import { SectionTitle } from '../components/Card'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { MissionProgress } from '../components/MissionProgress'
import { TodayCard } from '../components/TodayCard'
import type { Progress } from '../engine/gamification'
import type { DueItem, Evaluation } from '../engine/types'

/**
 * Below the hero (where the body model lives) the dashboard reads in two rows on wide
 * screens: the day (what to log, and how the streak stands) side by side, then every reading
 * across the full width. The progress column lines up under the body model. On phones it is
 * one column: today, readings, then progress.
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
}) {
  return (
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

      <section className="@container lg:col-span-2 lg:row-start-2" aria-labelledby="readings-title">
        <div className="mb-3 px-1">
          <SectionTitle id="readings-title">Your readings</SectionTitle>
        </div>
        <IndicatorGrid evaluations={evaluations} selectedId={selectedIndicatorId} onSelect={onPickIndicator} now={now} />
      </section>

      <div className="lg:col-start-2 lg:row-start-1">
        <MissionProgress progress={progress} />
      </div>
    </div>
  )
}
