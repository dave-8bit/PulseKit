import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

import type { AnalyticsEventsOverTime } from '../../types/analytics'

type Props = {
  data: AnalyticsEventsOverTime
}

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}

const formatBucket = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  // Use a compact day label for readability
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function EventsOverTimeChart({ data }: Props) {
  const chartData = data.map((d) => ({ bucket: d.bucket, value: d.count }))

  return (
    <section className="pk-panel" style={{ padding: 16, borderRadius: 12, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Events Over Time</h2>
      </div>

      <div style={{ marginTop: 12, height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 20, left: 0 }}>
            <defs>
              <linearGradient id="pkAccent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => formatBucket(String(v))}
              interval={0}
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCompact} />
            <Tooltip formatter={(v) => formatCompact(Number(v))} labelFormatter={(v) => formatBucket(String(v))} />
            <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="url(#pkAccent)" />
            <Line type="monotone" dataKey="value" strokeWidth={2} stroke="var(--accent)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

