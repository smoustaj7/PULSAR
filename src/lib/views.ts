import type { IconName } from '../components/Icon'

export type View = 'overview' | 'trends' | 'manual' | 'resources'

/** Top-level views, in navigation order. `short` labels fit the phone tab bar. */
export const VIEWS: { id: View; label: string; short: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', short: 'Overview', icon: 'overview' },
  { id: 'trends', label: 'Trends', short: 'Trends', icon: 'trends' },
  { id: 'manual', label: 'Field manual', short: 'Manual', icon: 'manual' },
  { id: 'resources', label: 'NASA resources', short: 'NASA', icon: 'resources' },
]
