import { BodyPanel } from '../components/BodyPanel'
import { SectionTitle } from '../components/Card'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { MissionProgress } from '../components/MissionProgress'
import { SystemsNav } from '../components/SystemsNav'
import { TodayCard } from '../components/TodayCard'
import type { Progress } from '../engine/gamification'
import type { DueItem, Evaluation, RegionAssessment } from '../engine/types'

/**
 * Below the hero, three zones on wide screens: the body systems as a quick list on the
 * left, the dashboard (today, readings, progress) in the middle, and the body model, small,
 * on the right. The list and the model stay in view while the middle scrolls. On phones
 * the zones stack, with the list directly above the model it controls.
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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)_18.5rem] lg:items-start xl:grid-cols-[14rem_minmax(0,1fr)_21rem] xl:gap-8">
      <div className="order-3 lg:sticky lg:top-[5.5rem] lg:order-none">
        <div className="mb-3 px-3">
          <SectionTitle>Body systems</SectionTitle>
        </div>
        <SystemsNav regions={regions} selectedId={selectedRegionId} onSelect={onSelectRegion} pillId="rail-system" />
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

        <div className="order-5">
          <MissionProgress progress={progress} />
        </div>
      </div>

      <div className="order-4 lg:sticky lg:top-[5.5rem] lg:order-none">
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
