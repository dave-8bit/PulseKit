/**
 * PulseKit Realtime SSE Client (Phase 7C)
 *
 * SSE client built on fetch() + ReadableStream, sending the bearer token
 * via the standard Authorization header — no query-parameter auth.
 *
 * Why fetch + ReadableStream instead of the native EventSource API?
 * - EventSource does not support custom HTTP headers, so it forces
 *   query-parameter auth, which is rejected by the project's security
 *   model.
 * - fetch() with ReadableStream gives us full control over request
 *   headers (Authorization: Bearer ...), matching the existing API
 *   client authentication pattern.
 *
 * No UI logic — this module only manages the SSE stream lifecycle and
 * delegates events to the provided callbacks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of a realtime event delivered over SSE.
 * Matches the payload sent by the backend realtime.service.ts.
 */
export interface RealtimeEventPayload {
  id: string
  event_id: string
  event_type: string
  timestamp: string
  url: string
  properties: unknown
}

/**
 * Configuration for creating a realtime SSE connection.
 */
export interface RealtimeApiConfig {
  /** Base URL of the API (e.g. http://localhost:4000) */
  baseUrl: string
  /** Bearer token for authentication */
  token: string
}

/**
 * Callbacks invoked by the SSE client.
 *
 * All callbacks are optional — provide only the ones you need.
 */
export interface RealtimeEventHandlers {
  /** Fired when the initial `connected` SSE event is received. */
  onConnected?: () => void
  /** Fired for each analytics event pushed from the server. */
  onMessage?: (event: RealtimeEventPayload) => void
  /**
   * Fired when an error occurs.
   *
   * The error argument may be an Error for network/protocol failures,
   * or an Event for stream-level issues. Automatic reconnection is NOT
   * implemented — the caller can call connect() again if desired.
   */
  onError?: (error: Error | Event) => void
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface RealtimeClient {
  /**
   * Open (or re‑open) the SSE connection.
   *
   * If a connection is already open, it is aborted first. Returns nothing
   * — use the callbacks to react to stream events.
   */
  connect: () => void

  /**
   * Close the SSE connection.
   *
   * Safe to call multiple times. After calling disconnect(), no further
   * callbacks will fire and the underlying request is aborted.
   */
  disconnect: () => void
}

// ---------------------------------------------------------------------------
// SSE line parser
// ---------------------------------------------------------------------------

/**
 * Minimal SSE parser that splits raw byte chunks into SSE messages and
 * dispatches named events and data-only messages.
 *
 * This parser handles:
 *   - `event: <type>\ndata: <json>\n\n`  (named events)
 *   - `data: <json>\n\n`                  (unnamed messages)
 *
 * Comments (lines starting with `:`) and `id:` / `retry:` fields are
 * ignored since they are not used by our backend.
 */
function createSSEParser(
  onNamedEvent: (type: string, data: string) => void,
  onData: (data: string) => void,
): (chunk: string) => void {
  let buffer = ''

  return function parse(chunk: string): void {
    buffer += chunk

    // SSE messages are terminated by a double newline.
    const parts = buffer.split('\n\n')

    // Keep the last (potentially incomplete) part in the buffer.
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      if (part.length === 0) continue

      const lines = part.split('\n')
      let eventType: string | null = null
      let data: string | null = null

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          data = line.slice(6)
        }
        // `id:`, `retry:`, and comments (`:`) are ignored.
      }

      if (data === null) continue

      if (eventType) {
        onNamedEvent(eventType, data)
      } else {
        onData(data)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory implementation
// ---------------------------------------------------------------------------

/**
 * Create a realtime SSE client that connects to the backend analytics
 * SSE endpoint using fetch() + ReadableStream.
 *
 * Usage:
 *
 *   const realtime = createRealtimeApi(
 *     { baseUrl: 'http://localhost:4000', token: 'sk-...' },
 *     {
 *       onConnected: () => console.log('SSE connected'),
 *       onMessage: (payload) => console.log('Event:', payload),
 *       onError: (err) => console.error('SSE error', err),
 *     },
 *   )
 *
 *   realtime.connect()
 *   // later...
 *   realtime.disconnect()
 */
export function createRealtimeApi(
  config: RealtimeApiConfig,
  handlers: RealtimeEventHandlers,
): RealtimeClient {
  const { baseUrl, token } = config
  let abortController: AbortController | null = null

  /** Internal cleanup helper. Aborts the in-flight request. */
  function cleanup(): void {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  /**
   * Open (or re‑open) the SSE connection via fetch().
   *
   * The bearer token is sent as an HTTP header (Authorization: Bearer ...),
   * matching the existing API authentication pattern — no query parameters.
   */
  function connect(): void {
    // Abort any existing connection first.
    cleanup()

    abortController = new AbortController()
    const { signal } = abortController

    const url = new URL('/analytics/realtime', baseUrl)

    const parser = createSSEParser(
      // Named events — e.g. the initial `connected` event.
      (eventType, eventData) => {
        if (eventType === 'connected' && eventData === '{}') {
          handlers.onConnected?.()
        }
      },
      // Unnamed data messages — analytics event payloads.
      (data) => {
        try {
          const parsed = JSON.parse(data) as {
            type: string
            payload: RealtimeEventPayload
          }

          if (parsed.type === 'event' && parsed.payload) {
            handlers.onMessage?.(parsed.payload)
          }
        } catch {
          // Silently skip malformed JSON.
        }
      },
    )

    // Kick off the fetch in the background.
    // We intentionally do not await here — the stream is long-lived.
    ;(async () => {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal,
        })

        if (!response.ok) {
          handlers.onError?.(new Error(`SSE request failed (${response.status})`))
          return
        }

        const body = response.body
        if (!body) {
          handlers.onError?.(new Error('SSE response body is not readable'))
          return
        }

        const reader = body.getReader()
        const decoder = new TextDecoder()

        // Read stream chunks until aborted or the stream ends.
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          parser(text)
        }
      } catch (err: unknown) {
        // If the abort was intentional (disconnect()), do not fire onError.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        handlers.onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    })()
  }

  /**
   * Close the SSE connection and clean up all resources.
   *
   * After this call, no further callbacks will fire and the underlying
   * fetch request is aborted via AbortController.
   */
  function disconnect(): void {
    cleanup()
  }

  return { connect, disconnect }
}


