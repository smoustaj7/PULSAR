const BASE_LUNG_SCALE = 0.035
const SECONDS_PER_MINUTE = 60

export function lungEffortAt(
  value: number | undefined,
  normalBoundary: number | null | undefined,
  cautionBoundary: number | null | undefined,
  direction: 'low' | 'high',
): number {
  if (value === undefined || !Number.isFinite(value) || normalBoundary == null) return 0

  const distance = direction === 'low' ? normalBoundary - value : value - normalBoundary
  if (distance <= 0) return 0

  const cautionSpan =
    cautionBoundary == null
      ? 0
      : direction === 'low'
        ? normalBoundary - cautionBoundary
        : cautionBoundary - normalBoundary
  return cautionSpan > 0 ? Math.min(distance / cautionSpan, 1) : 1
}

export function lungScaleAt(respirationRate: number, elapsedSeconds: number, effort: number): number {
  const amplitude = BASE_LUNG_SCALE * (1 + Math.max(0, Math.min(1, effort)))
  const breath = Math.sin(elapsedSeconds * (respirationRate / SECONDS_PER_MINUTE) * Math.PI * 2)
  return 1 + amplitude * breath
}
