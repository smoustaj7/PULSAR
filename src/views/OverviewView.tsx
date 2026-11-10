import { SectionTitle } from '../components/Card'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { MissionProgress } from '../components/MissionProgress'
import { SystemsNav } from '../components/SystemsNav'
import { TodayCard } from '../components/TodayCard'
import type { Progress } from '../engine/gamification'
import type { DueItem, Evaluation, RegionAssessment } from '../engine/types'

/**
 * Below the hero (where the body model lives) the dashboard is two zones on wide screens:
 * the body systems as a quick list on the left, staying in view, and the day's work
 * (today, readings, progress) beside it. Picking a system opens the model on it. On phones
 * the list follows the readings.
 */
export function OverviewView({
  evaluations,
  regions,
  due,
  progress,
  now,
  missionDay,
  selectedRegionId,
  selectedIndicatorId,
  onOpenBody,
  onPickIndicator,
  onLog,
  onOpenRequirement,
  onOpenPlan,
}: {
  evaluations: Evaluation[]
  regions: RegionAssessment[]
  due: DueItem[]
  progress: Progress
  now: number
  missionDay: number
  selectedRegionId: string | null
  selectedIndicatorId: string
  /** Open the body model on one system. */
  onOpenBody: (regionId: string) => void
  onPickIndicator: (id: string) => void
  onLog: (indicatorId?: string) => void
  onOpenRequirement: (requirementId: string) => void
  onOpenPlan: () => void
}) {
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[14.5rem_minmax(0,1fr)] xl:gap-10">
      <div className="order-3 lg:sticky lg:top-[5.5rem] lg:order-none">
        <div className="mb-3 px-3">
          <SectionTitle>Body systems</SectionTitle>
        </div>
        <SystemsNav
          regions={regions}
          selectedId={selectedRegionId}
          onSelect={(id) => id && onOpenBody(id)}
          toggle={false}
          pillId="rail-system"
        />
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <div className="order-1">
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

        <section className="@container order-2" aria-labelledby="readings-title">
          <div className="mb-3 px-1">
            <SectionTitle id="readings-title">Your readings</SectionTitle>
          </div>
          <IndicatorGrid evaluations={evaluations} selectedId={selectedIndicatorId} onSelect={onPickIndicator} now={now} />
        </section>

        <div className="order-4">
          <MissionProgress progress={progress} />
        </div>
      </div>
    </div>
  )
}
