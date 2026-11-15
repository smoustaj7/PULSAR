import { MotionConfig, motion } from 'framer-motion'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Assistant } from './components/Assistant'
import { BodyPanel, type BodyPanelHandle } from './components/BodyPanel'
import { FieldManual } from './components/FieldManual'
import { MissionHero } from './components/MissionHero'
import { LogReadingSheet } from './components/ReadingForm'
import { ReportDialog } from './components/ReportDialog'
import { RequirementSheet } from './components/RequirementSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { SystemSheet } from './components/SystemSheet'
import { Toaster } from './components/Toaster'
import { Tour } from './components/Tour'
import { TabBar, TopBar } from './components/TopBar'
import { shiftFor } from './engine/cycle'
import { commsSummary } from './engine/comms'
import { farFromEarth, signalDelayMs } from './engine/lightTime'
import { radiationState } from './engine/radiation'
import { computeProgress } from './engine/gamification'
import { assessRegions, dueIndicators, evaluateLatest, overallStatus } from './engine/rules'
import { systemsById } from './content/lsah'
import { askJarvis } from './lib/askJarvis'
import { missionDay } from './lib/report'
import { tourSteps } from './lib/tour'
import { chatMetrics } from './lib/chatMetrics'
import { useActiveConfig } from './lib/useActiveConfig'
import { useDemoMode } from './lib/useDemoMode'
import { useNow } from './lib/useNow'
import { VIEWS, type View } from './lib/views'
import { useHealthStore } from './store/useHealthStore'
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
  const tourSeen = useHealthStore((s) => s.tourSeen)
  const injuries = useHealthStore((s) => s.injuries)
  const comms = useHealthStore((s) => s.comms)
  const setTourSeen = useHealthStore((s) => s.setTourSeen)

  const { config, indicatorsById, environment } = useActiveConfig()
  const [view, navigate] = useHashView()
  const [sheet, setSheet] = useState<'log' | 'report' | 'settings' | null>(null)
  const [requirementId, setRequirementId] = useState<string | null>(null)
  const [systemSheetId, setSystemSheetId] = useState<string | null>(null)
  const closeSheet = () => setSheet(null)

  // The tour shows the first time an astronaut reaches the dashboard, once its hero has
  // settled; finishing or skipping it marks it seen. Settings can bring it back.
  const [touring, setTouring] = useState(false)
  useEffect(() => {
    if (tourSeen || view !== 'overview') return
    const wait = setTimeout(() => setTouring(true), 1400)
    return () => clearTimeout(wait)
  }, [tourSeen, view])
  const endTour = useCallback(() => {
    setTouring(false)
    setTourSeen(true)
  }, [setTourSeen])

  const now = useNow()
  // Female crew who track a cycle get it on the dashboard, and their trends allow for it.
  const cycle = mission.sex === 'female' && mission.cycle?.pattern !== 'none' ? mission.cycle : undefined
  const shift = useMemo(() => shiftFor(cycle), [cycle])
  const regions = useMemo(() => assessRegions(readings, config, shift), [readings, config, shift])
  const evaluations = useMemo(() => evaluateLatest(readings, config, shift), [readings, config, shift])
  const due = useMemo(() => dueIndicators(readings, config, now), [readings, config, now])
  const progress = useMemo(() => computeProgress(readings, config, evaluations, now), [readings, config, evaluations, now])
  const status = overallStatus(regions)
  const day = missionDay(mission.missionStart, now)
  const radiation = useMemo(
    () => radiationState({ readings, environmentId: environment.id, missionStart: mission.missionStart, now }),
    [readings, environment.id, mission.missionStart, now],
  )
  // Far from Earth the link leads the dashboard; anywhere, a sent report keeps it there for the reply.
  const showEarthLink = farFromEarth(environment.id) || comms !== null

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
  const goTo = (v: View) => navigate(v)
  // NASA's research lives in Dr.Jarvis now: the links that opened a page of it ask instead.
  const askAboutSystem = (systemId: string) =>
    askJarvis(`What does NASA check for ${systemsById[systemId]?.label ?? systemId} on a mission, and how often?`)
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
        demo={demo.active && (demo.showing === 'female' ? 'Female demo' : demo.showing === 'male' ? 'Male demo' : 'Demo data')}
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
                sex={mission.sex === 'female' ? 'female' : 'male'}
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
            cycle={cycle}
            radiation={{ state: radiation, environmentLabel: environment.label }}
            earthLink={showEarthLink ? { environmentId: environment.id, onSendReport: () => setSheet('report') } : undefined}
            onOpenRequirement={setRequirementId}
            onOpenPlan={() => askJarvis('What health checks does NASA run on astronauts before, during and after a mission, and when?')}
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
              onOpenResearch={() =>
                askJarvis(`What has NASA’s research found about ${indicatorsById[selectedIndicatorId].label.toLowerCase()} in space?`)
              }
            />
          </Suspense>
        )}
        {view === 'manual' && <FieldManual />}

        <footer className="mt-10 border-t border-line pt-5 text-center text-xs leading-5 text-fg-subtle">
          Prototype for the NASA Space Apps Challenge 2026. Not a medical device: thresholds are illustrative.
        </footer>
        </div>
      </motion.main>

      <TabBar view={view} onNavigate={goTo} />
      <Assistant
        metrics={chatMetrics({ name: mission.crewName, sex: mission.sex, missionDay: day, environment, evaluations, now, injuries, cycle, radiation, comms: showEarthLink ? commsSummary(signalDelayMs(environment.id, now, day), comms, now) : undefined })}
      />

      <LogReadingSheet
        open={sheet === 'log'}
        onClose={closeSheet}
        indicatorId={selectedIndicatorId}
        onIndicatorChange={selectIndicator}
      />
      <ReportDialog
        open={sheet === 'report'}
        onClose={closeSheet}
        input={{ readings, config, environment, mission, now, injuries }}
        onSent={() => requestAnimationFrame(() => document.getElementById('earth-link')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
      />
      <SettingsSheet
        open={sheet === 'settings'}
        onClose={closeSheet}
        onTour={() => {
          closeSheet()
          goTo('overview')
          setTourSeen(false)
        }}
      />
      {touring && <Tour steps={tourSteps(mission.crewName.trim().split(/\s+/)[0] || 'astronaut')} onClose={endTour} />}
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
          askAboutSystem(systemId)
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
          askAboutSystem(systemId)
        }}
      />
      <Toaster />
    </MotionConfig>
  )
}
