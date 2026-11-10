import { BodyPanel } from '../components/BodyPanel'
import { SectionTitle } from '../components/Card'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { MissionProgress } from '../components/MissionProgress'
import { TodayCard } from '../components/TodayCard'
import type { Progress } from '../engine/gamification'
import type { DueItem, Evaluation, RegionAssessment } from '../engine/types'

/**
 * Below the hero (01, your status) the dashboard keeps the order you act in, numbered so a
 * first-time reader knows where to look next: 02 today, 03 readings, 04 the body, 05
 * progress. The body model stays beside the list on wide screens; on phones the columns
 * collapse (`contents`) so it slots in after the readings.
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
  onSelectRegion,
  onPickIndicator,
  onLog,
  onTrend,
  onOpenRequirement,
  onOpenPlan,
  onOpenSystem,
}: {
  evaluations: Evaluation[]
  regions: RegionAssessment[]
  due: DueItem[]
  progress: Progress
  now: number
  missionDay: number
  selectedRegionId: string | null
  selectedIndicatorId: string
  onSelectRegion: (id: string | null) => void
  onPickIndicator: (id: string) => void
  onLog: (indicatorId?: string) => void
  onTrend: (indicatorId: string) => void
  onOpenRequirement: (requirementId: string) => void
  onOpenPlan: () => void
  /** Open the full detail for one body system. */
  onOpenSystem: (regionId: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
      <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
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

        <section className="order-2" aria-labelledby="readings-title">
          <div className="mb-3 px-1">
            <div className="eyebrow mb-1">03 / Readings</div>
            <SectionTitle id="readings-title">Your readings</SectionTitle>
            <p className="mt-1 text-xs text-fg-subtle">Latest value of each. Tap one to find it on the body.</p>
          </div>
          <IndicatorGrid evaluations={evaluations} selectedId={selectedIndicatorId} onSelect={onPickIndicator} now={now} />
        </section>

        <div className="order-4">
          <MissionProgress progress={progress} />
        </div>
      </div>

      <div className="order-3 lg:sticky lg:top-[5.5rem] lg:col-span-5">
        <BodyPanel
          regions={regions}
          selectedId={selectedRegionId}
          onSelect={onSelectRegion}
          onTrend={onTrend}
          onLog={onLog}
          onDetails={onOpenSystem}
        />
      </div>
    </div>
  )
}
