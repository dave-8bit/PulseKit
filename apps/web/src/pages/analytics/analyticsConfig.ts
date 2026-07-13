export function getAnalyticsApiConfig() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
  const token = import.meta.env.VITE_API_TOKEN as string | undefined

  if (!baseUrl) {
    throw new Error('Missing VITE_API_BASE_URL')
  }
  if (!token) {
    throw new Error('Missing VITE_API_TOKEN')
  }

  return {
    baseUrl,
    token,
  }
}

