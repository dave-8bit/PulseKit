import type { ReactNode } from 'react'

type Props = {
  title: string
  value: number | string
  prefix?: ReactNode
  suffix?: ReactNode
}

export function StatisticCard({ title, value, prefix, suffix }: Props) {
  return (
    <section
      className="pk-card"
      style={{ padding: 16, borderRadius: 12, textAlign: 'left' }}
    >
      <div style={{ color: 'var(--text)', opacity: 0.9, fontSize: 14 }}>{title}</div>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {prefix}
        <div style={{ fontSize: 34, lineHeight: 1.1, color: 'var(--text-h)' }}>{value}</div>
        {suffix}
      </div>
    </section>
  )
}

