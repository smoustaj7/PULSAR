import type { IndicatorConfig, Status } from '../engine/types'

/** Static class names so Tailwind can see them at build time. */
export const STATUS_META: Record<
  Status,
  { label: string; text: string; bg: string; border: string; dot: string; color: string }
> = {
  nominal: {
    label: 'Nominal',
    text: 'text-nominal',
    bg: 'bg-nominal/10',
    border: 'border-nominal/35',
    dot: 'bg-nominal',
    color: 'var(--status-nominal)',
  },
  caution: {
    label: 'Caution',
    text: 'text-caution',
    bg: 'bg-caution/10',
    border: 'border-caution/35',
    dot: 'bg-caution',
    color: 'var(--status-caution)',
  },
  critical: {
    label: 'Critical',
    text: 'text-critical',
    bg: 'bg-critical/10',
    border: 'border-critical/40',
    dot: 'bg-critical',
    color: 'var(--status-critical)',
  },
  unknown: {
    label: 'No data',
    text: 'text-unknown',
    bg: 'bg-unknown/10',
    border: 'border-unknown/30',
    dot: 'bg-unknown',
    color: 'var(--status-unknown)',
  },
}

export function formatValue(indicator: IndicatorConfig, value: number): string {
  return value.toFixed(indicator.decimals)
}

export function formatRange(indicator: IndicatorConfig): string {
  const { min, max } = indicator.normal
  if (min !== null && max !== null) return `${min}–${max} ${indicator.unit}`
  if (min !== null) return `≥ ${min} ${indicator.unit}`
  if (max !== null) return `≤ ${max} ${indicator.unit}`
  return '—'
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const mins = Math.round((now - timestamp) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}
