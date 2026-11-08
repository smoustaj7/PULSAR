import { BodyPanel } from '../components/BodyPanel'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { MissionProgress } from '../components/MissionProgress'
import { StatusHero } from '../components/StatusHero'
import { TodayCard } from '../components/TodayCard'
import type { Progress } from '../engine/gamification'
import type { DueItem, EnvironmentConfig, Evaluation, RegionAssessment, Status } from '../engine/types'

/**
 * The dashboard reads top to bottom in the order you act: your status, today's list, your
 * readings, then progress. The body model stays beside it on wide screens. On phones the
 * columns collapse (`contents`) so the model can slot in after the readings.
 */
export function OverviewView({
  status,
  evaluations,
  regions,
  due,
  progress,
  environment,
  now,
  missionDay,
  selectedRegionId,
  selectedIndicatorId,
  onSelectRegion,
  onPickIndicator,
  onLog,
  onTrend,
  onReport,
  onSettings,
  onOpenRequirement,
  onOpenPlan,
  onOpenSystem,
}: {
  status: Status
  evaluations: Evaluation[]
  regions: RegionAssessment[]
  due: DueItem[]
  progress: Progress
  environment: EnvironmentConfig
  now: number
  missionDay: number
  selectedRegionId: string | null
  selectedIndicatorId: string
  onSelectRegion: (id: string | null) => void
  onPickIndicator: (id: string) => void
  onLog: (indicatorId?: string) => void
  onTrend: (indicatorId: string) => void
  onReport: () => void
  onSettings: () => void
  onOpenRequirement: (requirementId: string) => void
  onOpenPlan: () => void
  /** Open the full detail for one body system. */
  onOpenSystem: (regionId: string) => void
}) {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
      <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-5">
        <div className="order-1">
          <StatusHero
            status={status}
            evaluations={evaluations}
            environment={environment}
            dueCount={due.length}
            onPick={onPickIndicator}
            onReport={onReport}
            onLog={() => onLog()}
            onGoToday={() => document.getElementById('today')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            onChangeEnvironment={onSettings}
          />
        </div>

        <div className="order-2">
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

        <section className="order-3" aria-labelledby="readings-title">
          <div className="mb-3 px-1">
            <h2 id="readings-title" className="text-[15px] font-semibold tracking-tight">
              Your readings
            </h2>
            <p className="mt-0.5 text-xs text-fg-subtle">Latest value of each. Tap one to find it on the body.</p>
          </div>
          <IndicatorGrid evaluations={evaluations} selectedId={selectedIndicatorId} onSelect={onPickIndicator} now={now} />
        </section>

        <div className="order-5">
          <MissionProgress progress={progress} />
        </div>
      </div>

      <div className="order-4 lg:sticky lg:top-[5.5rem] lg:col-span-5">
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
