import { MotionConfig, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FieldManual } from './components/FieldManual'
import { LogReadingSheet } from './components/ReadingForm'
import { ReportDialog } from './components/ReportDialog'
import { SettingsSheet } from './components/SettingsSheet'
import { Toaster } from './components/Toaster'
import { TabBar, TopBar } from './components/TopBar'
import { computeProgress } from './engine/gamification'
import { assessRegions, dueIndicators, evaluateLatest, overallStatus } from './engine/rules'
import { missionDay } from './lib/report'
import { useActiveConfig } from './lib/useActiveConfig'
import { useNow } from './lib/useNow'
import { VIEWS, type View } from './lib/views'
import { useHealthStore } from './store/useHealthStore'
import { OverviewView } from './views/OverviewView'
import { TrendsView } from './views/TrendsView'

const readHash = (): View => {
  const id = window.location.hash.slice(1)
  return VIEWS.some((v) => v.id === id) ? (id as View) : 'overview'
}

/** The current view lives in the URL hash, so Back works and views can be linked to. */
function useHashView(): [View, (v: View) => void] {
  const [view, setView] = useState(readHash)
  useEffect(() => {
    const onChange = () => setView(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = useCallback((v: View) => {
    if (v !== readHash()) window.location.hash = v
    setView(v)
    window.scrollTo({ top: 0 })
  }, [])
  return [view, navigate]
}

export default function App() {
  const readings = useHealthStore((s) => s.readings)
  const mission = useHealthStore((s) => s.mission)
  const selectedRegionId = useHealthStore((s) => s.selectedRegionId)
  const selectedIndicatorId = useHealthStore((s) => s.selectedIndicatorId)
  const selectRegion = useHealthStore((s) => s.selectRegion)
  const selectIndicator = useHealthStore((s) => s.selectIndicator)

  const { config, indicatorsById, environment } = useActiveConfig()
  const [view, navigate] = useHashView()
  const [sheet, setSheet] = useState<'log' | 'report' | 'settings' | null>(null)
  const closeSheet = () => setSheet(null)

  const now = useNow()
  const regions = useMemo(() => assessRegions(readings, config), [readings, config])
  const evaluations = useMemo(() => evaluateLatest(readings, config), [readings, config])
  const due = useMemo(() => dueIndicators(readings, config, now), [readings, config, now])
  const progress = useMemo(() => computeProgress(readings, config, evaluations, now), [readings, config, evaluations, now])
  const status = overallStatus(regions)

  // Picking a vital anywhere also opens its body system, and brings that panel into view if it's off screen.
  const pickIndicator = (id: string) => {
    selectIndicator(id)
    selectRegion(indicatorsById[id].regionId)
    requestAnimationFrame(() =>
      document.getElementById('body-systems')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    )
  }
  const openLog = (id?: string) => {
    if (id) selectIndicator(id)
    setSheet('log')
  }
  const openTrend = (id: string) => {
    selectIndicator(id)
    navigate('trends')
  }

  return (
    <MotionConfig reducedMotion="user">
      <TopBar
        view={view}
        onNavigate={navigate}
        missionDay={missionDay(mission.missionStart, now)}
        environmentLabel={environment.label}
        crewName={mission.crewName}
        onLog={() => openLog()}
        onReport={() => setSheet('report')}
        onSettings={() => setSheet('settings')}
      />

      {/* New view appears at once and settles in; no exit animation to wait for. */}
      <motion.main
        key={view}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="mx-auto max-w-7xl px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-12"
      >
        {view === 'overview' && (
          <OverviewView
            status={status}
            evaluations={evaluations}
            regions={regions}
            due={due}
            progress={progress}
            environment={environment}
            now={now}
            selectedRegionId={selectedRegionId}
            selectedIndicatorId={selectedIndicatorId}
            onSelectRegion={selectRegion}
            onPickIndicator={pickIndicator}
            onLog={openLog}
            onTrend={openTrend}
            onReport={() => setSheet('report')}
            onSettings={() => setSheet('settings')}
          />
        )}
        {view === 'trends' && (
          <TrendsView
            readings={readings}
            evaluations={evaluations}
            indicatorId={selectedIndicatorId}
            onSelect={selectIndicator}
            onLog={openLog}
          />
        )}
        {view === 'manual' && <FieldManual />}

        <footer className="mt-10 border-t border-line pt-5 text-center text-xs leading-5 text-fg-subtle">
          Prototype for the NASA Space Apps Challenge 2026. Not a medical device. Thresholds are illustrative; always
          follow flight-surgeon guidance.
        </footer>
      </motion.main>

      <TabBar view={view} onNavigate={navigate} />

      <LogReadingSheet
        open={sheet === 'log'}
        onClose={closeSheet}
        indicatorId={selectedIndicatorId}
        onIndicatorChange={selectIndicator}
      />
      <ReportDialog
        open={sheet === 'report'}
        onClose={closeSheet}
        input={{ readings, config, environment, mission, now }}
      />
      <SettingsSheet open={sheet === 'settings'} onClose={closeSheet} />
      <Toaster />
    </MotionConfig>
  )
}
