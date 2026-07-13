import type { AnalyticsTopPages } from '../../types/analytics'

type Props = {
  data: AnalyticsTopPages
}

export function TopPagesTable({ data }: Props) {
  return (
    <section className="pk-panel" style={{ padding: 16, borderRadius: 12, textAlign: 'left' }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Top Pages</h2>

      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Page</th>
              <th style={thStyle}>Views</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={`${row.url}-${idx}`}>
                <td style={tdStyle}>{idx + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'var(--mono)' }}>{row.url}</td>
                <td style={tdStyle}>{row.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-h)',
  borderBottom: '1px solid var(--border)',
  padding: '10px 8px',
}

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--border)',
  padding: '10px 8px',
  fontSize: 14,
  color: 'var(--text)',
  textAlign: 'center',
}

