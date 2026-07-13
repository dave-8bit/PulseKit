/** Backend response wrapper shape across analytics endpoints */
export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiError = {
  success: false
  error: string
}

export type AnalyticsPageViewsTotal = {
  totalPageViews: number
}

export type AnalyticsEventsByType = Array<{
  eventType: string
  count: number
}>

export type AnalyticsTopPages = Array<{
  url: string
  count: number
}>

export type AnalyticsEventsOverTime = Array<{
  bucket: string // ISO string from API JSON
  count: number
}>

export type AnalyticsPageViewsTotalResponse = ApiSuccess<AnalyticsPageViewsTotal> | ApiError
export type AnalyticsEventsByTypeResponse = ApiSuccess<AnalyticsEventsByType> | ApiError
export type AnalyticsTopPagesResponse = ApiSuccess<AnalyticsTopPages> | ApiError
export type AnalyticsEventsOverTimeResponse = ApiSuccess<AnalyticsEventsOverTime> | ApiError

export type PageViewsTotalQuery = {
  start?: string
  end?: string
}

export type EventsByTypeQuery = {
  start?: string
  end?: string
}

export type TopPagesQuery = {
  start?: string
  end?: string
  limit?: number
}

export type EventsOverTimeQuery = {
  start?: string
  end?: string
  granularity: 'hour' | 'day'
}

