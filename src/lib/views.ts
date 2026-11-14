import type { IconName } from '../components/Icon'

export type View = 'overview' | 'trends' | 'manual'

/** Top-level views, in navigation order. `short` labels fit the phone tab bar. */
export const VIEWS: { id: View; label: string; short: string; icon: IconName }[] = [
  { id: 'overview', label: 'Dashboard', short: 'Dashboard', icon: 'overview' },
  { id: 'trends', label: 'Trends', short: 'Trends', icon: 'trends' },
  { id: 'manual', label: 'Field manual', short: 'Manual', icon: 'manual' },
]

