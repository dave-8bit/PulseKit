import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

import type { AnalyticsEventsByType } from '../../types/analytics'

type Props = {
  data: AnalyticsEventsByType
}

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}

export function EventsByTypeChart({ data }: Props) {
  const chartData = data.map((d) => ({ name: d.eventType, value: d.count }))

  return (
    <section className="pk-panel" style={{ padding: 16, borderRadius: 12, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Events by Type</h2>
      </div>
      <div style={{ marginTop: 12, height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 16, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCompact} />
            <Tooltip formatter={(v) => formatCompact(Number(v))} />
            <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

