import { MotionConfig, motion } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BodyPanel, type BodyPanelHandle } from './components/BodyPanel'
import { FieldManual } from './components/FieldManual'
import { MissionHero } from './components/MissionHero'
import { LogReadingSheet } from './components/ReadingForm'
import { ReportDialog } from './components/ReportDialog'
import { RequirementSheet } from './components/RequirementSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { SystemSheet } from './components/SystemSheet'
import { Toaster } from './components/Toaster'
import { TabBar, TopBar } from './components/TopBar'
import { computeProgress } from './engine/gamification'
import { assessRegions, dueIndicators, evaluateLatest, overallStatus } from './engine/rules'
import { missionDay } from './lib/report'
import { useActiveConfig } from './lib/useActiveConfig'
import { useDemoMode } from './lib/useDemoMode'
import { useNow } from './lib/useNow'
import { VIEWS, type GuideTab, type View } from './lib/views'
import { useHealthStore } from './store/useHealthStore'
import { NasaGuideView } from './views/NasaGuideView'
import { OverviewView } from './views/OverviewView'
// hada import dyal bodypage
// import BodyPage from './pages/Bodypage'

// The charts library is a third of the app's code and only Trends draws charts, so that view
// loads on first visit rather than with the dashboard.
const TrendsView = lazy(() => import('./views/TrendsView').then((m) => ({ default: m.TrendsView })))

const readHash = (): View => {
  const id = window.location.hash.slice(1)
  return VIEWS.some((v) => v.id === id) ? (id as View) : 'overview'
}

/** The current view lives in the URL hash, so Back works and views can be linked to. */
function useHashView(): [View, (v: View, anchorId?: string) => void] {
  const [view, setView] = useState(readHash)
  useEffect(() => {
    const onChange = () => setView(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = useCallback((v: View, anchorId?: string) => {
    if (v !== readHash()) window.location.hash = v
    setView(v)
    if (!anchorId) return window.scrollTo({ top: 0 })
    // Wait for the new view to render, then bring the target into view.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })),
    )
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
  const demo = useDemoMode()

  const { config, indicatorsById, environment } = useActiveConfig()
  const [view, navigate] = useHashView()
  const [sheet, setSheet] = useState<'log' | 'report' | 'settings' | null>(null)
  const [nasaHighlight, setNasaHighlight] = useState<string | null>(null)
  const [guideTab, setGuideTab] = useState<GuideTab>('plan')
  const [requirementId, setRequirementId] = useState<string | null>(null)
  const [systemSheetId, setSystemSheetId] = useState<string | null>(null)
  const closeSheet = () => setSheet(null)

  const now = useNow()
  const regions = useMemo(() => assessRegions(readings, config), [readings, config])
  const evaluations = useMemo(() => evaluateLatest(readings, config), [readings, config])
  const due = useMemo(() => dueIndicators(readings, config, now), [readings, config, now])
  const progress = useMemo(() => computeProgress(readings, config, evaluations, now), [readings, config, evaluations, now])
  const status = overallStatus(regions)
  const day = missionDay(mission.missionStart, now)

  // Picking a body system or a vital anywhere opens the body model on that system.
  const body = useRef<BodyPanelHandle>(null)
  const openBody = (regionId: string) => {
    selectRegion(regionId)
    body.current?.expand()
  }
  const pickIndicator = (id: string) => {
    selectIndicator(id)
    openBody(indicatorsById[id].regionId)
  }
  const openLog = (id?: string) => {
    if (id) selectIndicator(id)
    setSheet('log')
  }
  const openTrend = (id: string) => {
    selectIndicator(id)
    navigate('trends')
  }
  // Plain navigation (tab bar, top bar) drops any "you came from here" highlight.
  const goTo = (v: View) => {
    setNasaHighlight(null)
    navigate(v)
  }
  const openRegion = (regionId: string) => {
    selectRegion(regionId)
    navigate('overview')
    // Wait for the dashboard (and the model card in it) to render before growing it.
    requestAnimationFrame(() => requestAnimationFrame(() => body.current?.expand()))
  }
  // Open the NASA guide at a section, optionally outlining one body system.
  const openGuide = (tab: GuideTab, systemId?: string) => {
    setGuideTab(tab)
    setNasaHighlight(systemId ?? null)
    navigate('resources', systemId ? `lsah-${systemId}` : undefined)
  }
// Hna fin kanzid const 
//const [suitVisible, setSuitVisible] = useState(true)

  return (
    
    <MotionConfig reducedMotion="user">
      <TopBar
        view={view}
        onNavigate={goTo}
        crewName={mission.crewName}
        onLog={() => openLog()}
        onReport={() => setSheet('report')}
        onSettings={() => setSheet('settings')}
        demo={demo.active}
        onExitDemo={demo.exit}
      />

      {/* New view appears at once and settles in; no exit animation to wait for. */}
      <motion.main
        key={view}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="pb-28 md:pb-12"
      >
        {view === 'overview' && (
          <MissionHero
            status={status}
            evaluations={evaluations}
            dueCount={due.length}
            model={
              <BodyPanel
                ref={body}
                regions={regions}
                selectedId={selectedRegionId}
                onSelect={selectRegion}
                onTrend={openTrend}
                onLog={openLog}
                onDetails={setSystemSheetId}
              />
            }
            onPick={pickIndicator}
            onReport={() => setSheet('report')}
            onLog={() => openLog()}
            onTryDemo={demo.enter}
            onGoToday={() => document.getElementById('today')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        )}
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${view === 'overview' ? 'pt-8' : 'pt-5 md:pt-10'}`}>
        {view === 'overview' && (
          <OverviewView
            evaluations={evaluations}
            due={due}
            progress={progress}
            now={now}
            selectedIndicatorId={selectedIndicatorId}
            onPickIndicator={pickIndicator}
            onLog={openLog}
            missionDay={day}
            onOpenRequirement={setRequirementId}
            onOpenPlan={() => openGuide('plan')}
          />
        )}
        {/*Hna bach t importer the bodypage model wlakin 4adi ykon comme un bloc 
        mn b3d n9dro nzidoh like a background bnisba njoma etc */}
        {/*view === 'overview' && (
          <BodyPage suitVisible={suitVisible} setSuitVisible={setSuitVisible} />
        )*/}
        {view === 'trends' && (
          <Suspense fallback={<div className="min-h-[60svh]" aria-busy="true" />}>
            <TrendsView
              readings={readings}
              evaluations={evaluations}
              indicatorId={selectedIndicatorId}
              onSelect={selectIndicator}
              onLog={openLog}
              onOpenRequirement={setRequirementId}
              onOpenResearch={() => openGuide('research')}
            />
          </Suspense>
        )}
        {view === 'manual' && <FieldManual />}
        {view === 'resources' && (
          <NasaGuideView
            tab={guideTab}
            onTabChange={(t) => {
              setNasaHighlight(null)
              setGuideTab(t)
            }}
            missionDay={day}
            highlightSystemId={nasaHighlight}
            onOpenRequirement={setRequirementId}
            onOpenRegion={openRegion}
            onTrend={openTrend}
          />
        )}

        <footer className="mt-10 border-t border-line pt-5 text-center text-xs leading-5 text-fg-subtle">
          Prototype for the NASA Space Apps Challenge 2026. Not a medical device: thresholds are illustrative.
        </footer>
        </div>
      </motion.main>

      <TabBar view={view} onNavigate={goTo} />

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
      <SystemSheet
        assessment={regions.find((r) => r.region.id === systemSheetId) ?? null}
        now={now}
        onClose={() => setSystemSheetId(null)}
        onLog={(id) => {
          setSystemSheetId(null)
          openLog(id)
        }}
        onTrend={(id) => {
          setSystemSheetId(null)
          openTrend(id)
        }}
        onOpenNasa={(systemId) => {
          setSystemSheetId(null)
          openGuide('systems', systemId)
        }}
        onOpenRequirement={setRequirementId}
      />
      <RequirementSheet
        requirementId={requirementId}
        missionDay={day}
        onClose={() => setRequirementId(null)}
        onLog={(id) => {
          setRequirementId(null)
          openLog(id)
        }}
        onOpenSystem={(systemId) => {
          setRequirementId(null)
          openGuide('systems', systemId)
        }}
      />
      <Toaster />
    </MotionConfig>
  )
}
