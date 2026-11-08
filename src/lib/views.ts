import type { IconName } from '../components/Icon'

export type View = 'overview' | 'trends' | 'manual' | 'resources'

/** Top-level views, in navigation order. `short` labels fit the phone tab bar. */
export const VIEWS: { id: View; label: string; short: string; icon: IconName }[] = [
  { id: 'overview', label: 'Dashboard', short: 'Dashboard', icon: 'overview' },
  { id: 'trends', label: 'Trends', short: 'Trends', icon: 'trends' },
  { id: 'manual', label: 'Field manual', short: 'Manual', icon: 'manual' },
  { id: 'resources', label: 'NASA guide', short: 'NASA', icon: 'resources' },
]

export type GuideTab = 'plan' | 'systems' | 'research' | 'about'

/** Sections of the NASA guide. `short` labels fit four across on a phone. */
export const GUIDE_TABS: { id: GuideTab; label: string; short: string }[] = [
  { id: 'plan', label: 'Mission plan', short: 'Plan' },
  { id: 'systems', label: 'Body systems', short: 'Systems' },
  { id: 'research', label: 'Research', short: 'Research' },
  { id: 'about', label: 'About LSAH', short: 'About' },
]
