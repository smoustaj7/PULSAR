import type { IconName } from '../components/Icon'

/**
 * A measurement's instructions as numbered steps: one per sentence, and a sentence's
 * "…, then …" split in two, since each is a separate thing to do.
 */
export function steps(howTo: string): string[] {
  return howTo
    .split(/(?<=\.)\s+(?=[A-Z])|,\s+then\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
}

/** How often to measure, said the way a schedule says it. */
export function cadence(hours: number): string {
  if (hours === 24) return 'Daily'
  if (hours === 12) return 'Twice a day'
  if (hours < 24) return `Every ${hours} h`
  if (hours === 168) return 'Weekly'
  return `Every ${Math.round(hours / 24)} days`
}

const HAZARD_ICONS: Record<string, IconName> = {
  'Space radiation': 'shield',
  'Isolation & confinement': 'brain',
  'Distance from Earth': 'orbit',
  'Gravity fields': 'bone',
  'Hostile closed environment': 'wind',
}
export const hazardIcon = (label: string): IconName => HAZARD_ICONS[label] ?? 'alert'
