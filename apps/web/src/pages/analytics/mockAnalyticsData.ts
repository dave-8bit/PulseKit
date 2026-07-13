import type {
  AnalyticsEventsByType,
  AnalyticsEventsOverTime,
  AnalyticsPageViewsTotal,
  AnalyticsTopPages,
} from '../../types/analytics'

export const mockAnalyticsPageViewsTotal: AnalyticsPageViewsTotal = {
  totalPageViews: 128_482,
}

export const mockAnalyticsEventsByType: AnalyticsEventsByType = [
  { eventType: 'page_view', count: 62_120 },
  { eventType: 'button_click', count: 18_440 },
  { eventType: 'form_submit', count: 9_305 },
  { eventType: 'video_play', count: 5_912 },
  { eventType: 'scroll', count: 32_805 },
]

export const mockAnalyticsEventsOverTime: AnalyticsEventsOverTime = [
  { bucket: '2026-06-28T00:00:00.000Z', count: 2310 },
  { bucket: '2026-06-29T00:00:00.000Z', count: 2840 },
  { bucket: '2026-06-30T00:00:00.000Z', count: 3125 },
  { bucket: '2026-07-01T00:00:00.000Z', count: 3690 },
  { bucket: '2026-07-02T00:00:00.000Z', count: 4012 },
  { bucket: '2026-07-03T00:00:00.000Z', count: 4465 },
  { bucket: '2026-07-04T00:00:00.000Z', count: 5120 },
]

export const mockAnalyticsTopPages: AnalyticsTopPages = [
  { url: '/analytics', count: 18_210 },
  { url: '/pricing', count: 12_740 },
  { url: '/docs/getting-started', count: 10_380 },
  { url: '/blog/launch', count: 8_990 },
  { url: '/login', count: 7_450 },
  { url: '/dashboard', count: 6_120 },
]

