import { useMemo, useState } from 'react'
import { BodyMap } from './components/BodyMap'
import { Card } from './components/Card'
import { DueList } from './components/DueList'
import { FieldManual } from './components/FieldManual'
import { Header } from './components/Header'
import { IndicatorGrid } from './components/IndicatorGrid'
import { MissionProgress } from './components/MissionProgress'
import { ReadingForm } from './components/ReadingForm'
import { ReadingHistory } from './components/ReadingHistory'
import { RegionPanel } from './components/RegionPanel'
import { TrendChart } from './components/TrendChart'
import { computeProgress } from './engine/gamification'
import { assessRegions, dueIndicators, evaluateLatest, overallStatus } from './engine/rules'
import { useActiveConfig } from './lib/useActiveConfig'
import { useNow } from './lib/useNow'
import { useHealthStore } from './store/useHealthStore'

type Tab = 'dashboard' | 'manual'
const TABS: [Tab, string][] = [
  ['dashboard', 'Dashboard'],
  ['manual', 'Field manual'],
]

export default function App() {
  const readings = useHealthStore((s) => s.readings)
  const selectedRegionId = useHealthStore((s) => s.selectedRegionId)
  const selectedIndicatorId = useHealthStore((s) => s.selectedIndicatorId)
  const selectRegion = useHealthStore((s) => s.selectRegion)
  const selectIndicator = useHealthStore((s) => s.selectIndicator)

  const { config, indicatorsById, environment } = useActiveConfig()
  const [tab, setTab] = useState<Tab>('dashboard')

  const regions = useMemo(() => assessRegions(readings, config), [readings, config])
  const evaluations = useMemo(() => evaluateLatest(readings, config), [readings, config])
  const now = useNow()
  const due = useMemo(() => dueIndicators(readings, config, now), [readings, config, now])
  const progress = useMemo(() => computeProgress(readings, config, evaluations, now), [readings, config, evaluations, now])
  const status = overallStatus(regions)
  const selectedRegion = regions.find((r) => r.region.id === selectedRegionId) ?? null

  // Picking an indicator anywhere also highlights its body region.
  const pickIndicator = (id: string) => {
    selectIndicator(id)
    selectRegion(indicatorsById[id].regionId)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
      <Header status={status} now={now} environment={environment} />

      <nav className="flex gap-1 border-b border-white/10" aria-label="Views">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === id ? 'border-sky-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'manual' ? (
        <FieldManual />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-12">
            <Card title="Body map" className="lg:col-span-4">
              <BodyMap regions={regions} selectedId={selectedRegionId} onSelect={selectRegion} />
              <p className="mt-2 text-center text-xs text-slate-500">Click a region · colors show the worst indicator</p>
            </Card>
            <div className="lg:col-span-8">
              <RegionPanel assessment={selectedRegion} onPickIndicator={pickIndicator} />
            </div>
          </div>

          <IndicatorGrid evaluations={evaluations} selectedId={selectedIndicatorId} onSelect={pickIndicator} />

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <TrendChart readings={readings} indicatorId={selectedIndicatorId} onChangeIndicator={pickIndicator} />
              <ReadingHistory readings={readings} indicatorId={selectedIndicatorId} />
            </div>
            <div className="space-y-4 lg:col-span-4">
              <MissionProgress progress={progress} onPick={pickIndicator} />
              <ReadingForm indicatorId={selectedIndicatorId} onIndicatorChange={selectIndicator} />
              <DueList items={due} onPick={pickIndicator} />
            </div>
          </div>
        </>
      )}

      <footer className="pb-4 text-center text-xs text-slate-500">
        Prototype for the NASA Space Apps Challenge 2026. Not a medical device. Thresholds are illustrative; always follow
        flight-surgeon guidance.
      </footer>
    </div>
  )
}
