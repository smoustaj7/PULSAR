import type { IconName } from '../components/Icon'

/** The icon for each reading, so a card can be recognised at a glance. */
const INDICATOR_ICONS: Record<string, IconName> = {
  heartRate: 'heart',
  systolic: 'gauge',
  diastolic: 'gauge',
  glucose: 'drop',
  temperature: 'thermometer',
  spo2: 'bubbles',
  cabinCO2: 'wind',
  sleep: 'moon',
  mood: 'smile',
  exercise: 'dumbbell',
}

export const indicatorIcon = (id: string): IconName => INDICATOR_ICONS[id] ?? 'info'
