import type {
  AnalyticsEventsByTypeResponse,
  AnalyticsEventsOverTimeResponse,
  AnalyticsPageViewsTotalResponse,
  AnalyticsTopPagesResponse,
  EventsByTypeQuery,
  EventsOverTimeQuery,
  PageViewsTotalQuery,
  TopPagesQuery,
} from '../types/analytics'

import { createApiClient, type ApiClientConfig } from './client'

export function createAnalyticsApi(config: ApiClientConfig) {
  const client = createApiClient(config)

  return {
    getPageViewsTotal(query: PageViewsTotalQuery) {
      return client.get<AnalyticsPageViewsTotalResponse>('/analytics/page-views/total', query)
    },

    getEventsByType(query: EventsByTypeQuery) {
      return client.get<AnalyticsEventsByTypeResponse>('/analytics/events-by-type', query)
    },

    getTopPages(query: TopPagesQuery) {
      return client.get<AnalyticsTopPagesResponse>('/analytics/top-pages', query)
    },

    getEventsOverTime(query: EventsOverTimeQuery) {
      return client.get<AnalyticsEventsOverTimeResponse>('/analytics/events-over-time', query)
    },
  }
}

