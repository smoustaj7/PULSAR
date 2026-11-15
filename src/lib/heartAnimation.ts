const HEART_SCALE = 0.07
const SECONDS_PER_MINUTE = 60

export function heartScaleAt(heartRate: number, elapsedSeconds: number): number {
  const beat = Math.sin(elapsedSeconds * (heartRate / SECONDS_PER_MINUTE) * Math.PI * 2)
  return 1 + HEART_SCALE * Math.max(0, beat)
}
