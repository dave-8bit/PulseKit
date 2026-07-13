export type ApiClientConfig = {
  /** Base URL for the API, e.g. http://localhost:4000 */
  baseUrl: string
  /** Bearer token for Authorization header */
  token: string
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, token } = config

  return {
    async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
      const url = new URL(path, baseUrl)
      if (query) {
        for (const [key, value] of Object.entries(query)) {
          if (value === undefined) continue
          url.searchParams.set(key, String(value))
        }
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API request failed (${res.status}): ${text}`)
      }

      return (await res.json()) as T
    },
  }
}

