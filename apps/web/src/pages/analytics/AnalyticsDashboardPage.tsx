import { useEffect, useMemo, useState } from 'react'

import { StatisticCard } from '../../components/cards/StatisticCard'
import { EventsByTypeChart } from '../../components/charts/EventsByTypeChart'
import { EventsOverTimeChart } from '../../components/charts/EventsOverTimeChart'
import { TopPagesTable } from '../../components/tables/TopPagesTable'

import { createAnalyticsApi } from '../../api/analyticsApi'
import type {
  AnalyticsEventsByType,
  AnalyticsEventsOverTime,
  AnalyticsPageViewsTotal,
  AnalyticsTopPages,
} from '../../types/analytics'

import { getAnalyticsApiConfig } from './analyticsConfig'

export function AnalyticsDashboardPage() {
  const api = useMemo(() => {
    const config = getAnalyticsApiConfig()
    return createAnalyticsApi(config)
  }, [])

  const [pageViewsTotal, setPageViewsTotal] = useState<AnalyticsPageViewsTotal | null>(null)
  const [eventsByType, setEventsByType] = useState<AnalyticsEventsByType | null>(null)
  const [eventsOverTime, setEventsOverTime] = useState<AnalyticsEventsOverTime | null>(null)
  const [topPages, setTopPages] = useState<AnalyticsTopPages | null>(null)

  useEffect(() => {
    api
      .getPageViewsTotal({})
      .then((res) => {
        if ('success' in res && res.success) setPageViewsTotal(res.data)
      })

    api
      .getEventsByType({})
      .then((res) => {
        if ('success' in res && res.success) setEventsByType(res.data)
      })

    api
      .getTopPages({})
      .then((res) => {
        if ('success' in res && res.success) setTopPages(res.data)
      })

    api
      .getEventsOverTime({
        granularity: 'day',
      })
      .then((res) => {
        if ('success' in res && res.success) setEventsOverTime(res.data)
      })
  }, [api])

  return (
    <div style={{ paddingBottom: 32 }}>
      <h1 style={{ marginBottom: 22 }}>Analytics Dashboard</h1>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
        <StatisticCard
          title="Total Page Views"
          value={pageViewsTotal?.totalPageViews ?? 0}
        />

        <EventsByTypeChart data={eventsByType ?? []} />
        <EventsOverTimeChart data={eventsOverTime ?? []} />
        <TopPagesTable data={topPages ?? []} />
      </div>
    </div>
  )
}



