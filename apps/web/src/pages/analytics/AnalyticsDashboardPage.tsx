import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatisticCard } from '../../components/cards/StatisticCard'
import { EventsByTypeChart } from '../../components/charts/EventsByTypeChart'
import { EventsOverTimeChart } from '../../components/charts/EventsOverTimeChart'
import { TopPagesTable } from '../../components/tables/TopPagesTable'

import { createAnalyticsApi } from '../../api/analyticsApi'
import { createRealtimeApi } from '../../api/realtimeApi'
import type { RealtimeEventPayload } from '../../api/realtimeApi'
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

  // ---- Incremental state updaters for realtime events (stable refs) ----

  /**
   * Replicate PostgreSQL DATE_TRUNC('day', timestamp) in JavaScript.
   *
   * The backend's getEventsOverTime service uses:
   *   DATE_TRUNC('day', timestamp) AS bucket
   * which returns a Date truncated to midnight UTC.  When serialised to JSON
   * this becomes an ISO string like "2026-06-18T00:00:00.000Z".
   *
   * We must produce an identical bucket key so that incremental realtime
   * updates match the shape of data returned by the initial REST fetch.
   *
   * Backend also supports 'hour' granularity (DATE_TRUNC('hour', ...)),
   * but the dashboard currently requests 'day'.  If a future phase adds
   * hour-level initial fetch, this function would need a granularity
   * parameter.  For now it is hard-coded to day-level truncation.
   */
  const toDayBucket = useCallback((isoTimestamp: string): string => {
    const d = new Date(isoTimestamp)
    const truncated = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    )
    return truncated.toISOString()
  }, [])

  const handleRealtimeMessage = useCallback((event: RealtimeEventPayload) => {
    // 1. Total Page Views — increment by 1 for each incoming event.
    setPageViewsTotal((prev) => ({
      totalPageViews: (prev?.totalPageViews ?? 0) + 1,
    }))

    // 2. Events by Type — find matching eventType and bump its count,
    //    or append a new entry if unseen.
    setEventsByType((prev) => {
      const list = prev ?? []
      const idx = list.findIndex((e) => e.eventType === event.event_type)
      if (idx >= 0) {
        const updated = [...list]
        updated[idx] = { ...updated[idx], count: updated[idx].count + 1 }
        return updated
      }
      return [...list, { eventType: event.event_type, count: 1 }]
    })

    // 3. Top Pages — find matching url, bump its count,
    //    and always re-sort descending by count so the ranking is exact.
    setTopPages((prev) => {
      const list = prev ?? []
      const idx = list.findIndex((p) => p.url === event.url)
      if (idx >= 0) {
        const updated = [...list]
        updated[idx] = { ...updated[idx], count: updated[idx].count + 1 }
        // Re-sort after every increment to keep ranking exact.
        return updated.sort((a, b) => b.count - a.count)
      }
      // Append new page and sort descending by count.
      return [...list, { url: event.url, count: 1 }].sort(
        (a, b) => b.count - a.count,
      )
    })

    // 4. Events Over Time — match the event's timestamp to a DATE_TRUNC('day')
    //    bucket (ISO string of midnight UTC), increment or append.
    //    Keep chronological order.
    setEventsOverTime((prev) => {
      const list = prev ?? []
      const bucket = toDayBucket(event.timestamp)
      const idx = list.findIndex((e) => e.bucket === bucket)
      if (idx >= 0) {
        const updated = [...list]
        updated[idx] = { ...updated[idx], count: updated[idx].count + 1 }
        return updated
      }
      return [...list, { bucket, count: 1 }].sort(
        (a, b) => a.bucket.localeCompare(b.bucket),
      )
    })
  }, [toDayBucket])

  // ---- Initial REST fetch ----

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

  // ---- Realtime SSE connection (lifecycle-bound) ----

  useEffect(() => {
    const config = getAnalyticsApiConfig()
    const realtime = createRealtimeApi(config, {
      onMessage: handleRealtimeMessage,
    })

    realtime.connect()

    return () => {
      realtime.disconnect()
    }
  }, [handleRealtimeMessage])

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



