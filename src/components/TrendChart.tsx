import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useActiveConfig } from '../lib/useActiveConfig'
import { evaluateValue, seriesFor } from '../engine/rules'
import type { Reading } from '../engine/types'
import { STATUS_META, formatRange, formatValue } from '../lib/status'
import { Card } from './Card'

const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function TrendChart({ readings, indicatorId }: { readings: Reading[]; indicatorId: string }) {
  const { indicatorsById } = useActiveConfig()
  const indicator = indicatorsById[indicatorId]
  const data = useMemo(
    () => seriesFor(readings, indicatorId).map((r) => ({ t: r.timestamp, v: r.value })),
    [readings, indicatorId],
  )

  // Y domain: fit the data plus the normal band, clamped to the indicator's plausible input range.
  const domain = useMemo<[number, number]>(() => {
    const vals = data.map((d) => d.v)
    const { normal, caution, input } = indicator
    const lo = Math.min(...vals, caution.min ?? normal.min ?? input.min)
    const hi = Math.max(...vals, caution.max ?? normal.max ?? input.max)
    // Round outward to a "nice" step so axis ticks land on clean numbers.
    const span = hi - lo || 1
    const step = 10 ** Math.floor(Math.log10(span)) / 2
    return [Math.max(input.min, Math.floor(lo / step) * step), Math.min(input.max, Math.ceil(hi / step) * step)]
  }, [data, indicator])

  const [yMin, yMax] = domain
  const n = indicator.normal
  const c = indicator.caution
  const latest = data.at(-1)?.v
  const latestStatus = latest === undefined ? 'unknown' : evaluateValue(indicator, latest).status

  return (
    <Card
      title={indicator.label}
      subtitle={`Green band is normal (${formatRange(indicator)}), yellow is caution`}
      action={
        latest !== undefined && (
          <div className="text-right">
            <div className={`text-xl leading-6 font-semibold tabular-nums ${latestStatus === 'nominal' ? 'text-fg' : STATUS_META[latestStatus].text}`}>
              {formatValue(indicator, latest)}
              <span className="ml-1 text-xs font-normal text-fg-subtle">{indicator.unit}</span>
            </div>
            <div className="text-xs text-fg-subtle">latest · {data.length} readings</div>
          </div>
        )
      }
    >
      {data.length === 0 ? (
        <div className="grid h-64 place-items-center text-sm text-fg-subtle">No readings yet for this vital. Log one to start the trend.</div>
      ) : (
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              {/* Caution bands (below / above normal), then normal band on top */}
              <ReferenceArea y1={c.min ?? yMin} y2={n.min ?? yMin} fill="var(--status-caution)" fillOpacity={0.08} ifOverflow="hidden" />
              <ReferenceArea y1={n.max ?? yMax} y2={c.max ?? yMax} fill="var(--status-caution)" fillOpacity={0.08} ifOverflow="hidden" />
              <ReferenceArea y1={n.min ?? yMin} y2={n.max ?? yMax} fill="var(--status-nominal)" fillOpacity={0.1} ifOverflow="hidden" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={fmtDate}
                stroke="#8597B1"
                fontSize={11}
              />
              <YAxis domain={domain} stroke="#8597B1" fontSize={11} allowDecimals={indicator.decimals > 0} />
              <Tooltip
                contentStyle={{ background: '#1C2541', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#EEF3F9' }}
                labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
                formatter={(v) => [`${v} ${indicator.unit}`, indicator.label]}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#5BC0DE"
                strokeWidth={2}
                isAnimationActive
                dot={(props) => {
                  const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: { v: number }; index: number }
                  const color = STATUS_META[evaluateValue(indicator, payload.v).status].color
                  return <circle key={index} cx={cx} cy={cy} r={4} fill={color} stroke="#1C2541" strokeWidth={1.5} />
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
