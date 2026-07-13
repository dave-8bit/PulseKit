import { StatisticCard } from '../../components/cards/StatisticCard'
import { EventsByTypeChart } from '../../components/charts/EventsByTypeChart'
import { EventsOverTimeChart } from '../../components/charts/EventsOverTimeChart'
import { TopPagesTable } from '../../components/tables/TopPagesTable'

import {
  mockAnalyticsEventsByType,
  mockAnalyticsEventsOverTime,
  mockAnalyticsPageViewsTotal,
  mockAnalyticsTopPages,
} from './mockAnalyticsData'

export function AnalyticsDashboardPage() {
  return (
    <div style={{ paddingBottom: 32 }}>
      <h1 style={{ marginBottom: 22 }}>Analytics Dashboard</h1>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
        <StatisticCard
          title="Total Page Views"
          value={mockAnalyticsPageViewsTotal.totalPageViews}
        />

        <EventsByTypeChart data={mockAnalyticsEventsByType} />
        <EventsOverTimeChart data={mockAnalyticsEventsOverTime} />
        <TopPagesTable data={mockAnalyticsTopPages} />
      </div>
    </div>
  )
}


