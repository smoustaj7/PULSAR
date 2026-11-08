import { BodyMap } from '../components/BodyMap'
import { Card } from '../components/Card'
import { DueList } from '../components/DueList'
import { IndicatorGrid } from '../components/IndicatorGrid'
import { MissionProgress } from '../components/MissionProgress'
import { NasaScheduleCard } from '../components/NasaScheduleCard'
import { RegionPanel } from '../components/RegionPanel'
import { StatusHero } from '../components/StatusHero'
import type { Progress } from '../engine/gamification'
import type { DueItem, EnvironmentConfig, Evaluation, RegionAssessment, Status } from '../engine/types'
import { STATUS_META } from '../lib/status'

/**
 * Status first, then what to do next (your readings, then NASA's checks), then the detail.
 * On phones the columns collapse (`contents`) so their cards can be reordered into that order.
 */
export function OverviewView({
  status,
  evaluations,
  regions,
  due,
  progress,
  environment,
  now,
  selectedRegionId,
  selectedIndicatorId,
  onSelectRegion,
  onPickIndicator,
  onLog,
  onTrend,
  onReport,
  onSettings,
  onOpenNasa,
  missionDay,
  onOpenRequirement,
  onOpenPlan,
}: {
  status: Status
  evaluations: Evaluation[]
  regions: RegionAssessment[]
  due: DueItem[]
  progress: Progress
  environment: EnvironmentConfig
  now: number
  selectedRegionId: string | null
  selectedIndicatorId: string
  onSelectRegion: (id: string | null) => void
  onPickIndicator: (id: string) => void
  onLog: (indicatorId?: string) => void
  onTrend: (indicatorId: string) => void
  onReport: () => void
  onSettings: () => void
  onOpenNasa: (systemId: string) => void
  missionDay: number
  onOpenRequirement: (requirementId: string) => void
  onOpenPlan: () => void
}) {
  const selectedRegion = regions.find((r) => r.region.id === selectedRegionId) ?? null

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start">
      <div className="contents lg:col-span-8 lg:block lg:space-y-4">
        <div className="order-1">
          <StatusHero
            status={status}
            evaluations={evaluations}
            environment={environment}
            onPick={onPickIndicator}
            onReport={onReport}
            onLog={() => onLog()}
            onChangeEnvironment={onSettings}
          />
        </div>

        <section className="order-4" aria-labelledby="vitals-title">
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
            <h2 id="vitals-title" className="text-lg font-semibold tracking-tight">
              Readings
            </h2>
            <span className="text-xs text-fg-subtle">Tap one to see its body system</span>
          </div>
          <IndicatorGrid evaluations={evaluations} selectedId={selectedIndicatorId} onSelect={onPickIndicator} now={now} />
        </section>

        <div id="body-systems" className="order-5 grid scroll-mt-20 gap-4 md:grid-cols-5">
          <Card title="Body map" subtitle="Color shows each system's worst vital" className="md:col-span-2">
            <BodyMap regions={regions} selectedId={selectedRegionId} onSelect={onSelectRegion} />
            <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
              {(['nominal', 'caution', 'critical', 'unknown'] as const).map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} />
                  {STATUS_META[s].label}
                </li>
              ))}
            </ul>
          </Card>
          <div className="md:col-span-3">
            <RegionPanel
              assessment={selectedRegion}
              regions={regions}
              now={now}
              onSelectRegion={onSelectRegion}
              onLog={onLog}
              onTrend={onTrend}
              onOpenNasa={onOpenNasa}
              onOpenRequirement={onOpenRequirement}
            />
          </div>
        </div>
      </div>

      <div className="contents lg:col-span-4 lg:block lg:space-y-4">
        <div className="order-2">
          <DueList items={due} now={now} onLog={onLog} />
        </div>
        <div className="order-3">
          <NasaScheduleCard missionDay={missionDay} onOpen={onOpenRequirement} onSeeAll={onOpenPlan} />
        </div>
        <div className="order-6">
          <MissionProgress progress={progress} onLog={onLog} />
        </div>
      </div>
    </div>
  )
}
