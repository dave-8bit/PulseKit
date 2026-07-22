/**
 * PulseKit Realtime SSE Client (Phase 7C)
 *
 * Browser-side EventSource client for the backend SSE endpoint at
 * GET /analytics/realtime.
 *
 * Authentication:
 * The browser EventSource API does not support custom HTTP headers, so the
 * bearer token is passed as a query parameter (?token=...). This is the
 * standard and widely-adopted approach for EventSource-based auth in the
 * browser (used by OpenAI, Stripe, and many others).
 *
 * No UI logic — this module only manages the EventSource lifecycle and
 * delegates events to callbacks provided by the caller.
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
   * Fired when an error occurs on the EventSource.
   *
   * Note: The browser fires `onerror` on network failures and when the
   * connection is closed unexpectedly. Automatic reconnection is NOT
   * implemented here — the caller can call connect() again if desired.
   */
  onError?: (error: Event) => void
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface RealtimeClient {
  /**
   * Open (or re‑open) the SSE connection.
   *
   * If a connection is already open, it is closed first before opening a
   * new one.  Returns the underlying EventSource instance for advanced
   * use cases (rarely needed).
   */
  connect: () => EventSource

  /**
   * Close the SSE connection.
   *
   * Safe to call multiple times.  After calling disconnect(), no further
   * callbacks will fire.  The underlying EventSource is properly cleaned up.
   */
  disconnect: () => void
}

/**
 * Create a realtime SSE client that connects to the backend analytics
 * SSE endpoint.
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
  let eventSource: EventSource | null = null

  /** Internal cleanup helper. */
  function cleanup(): void {
    if (!eventSource) return
    eventSource.onopen = null
    eventSource.onmessage = null
    eventSource.onerror = null
    eventSource.close()
    eventSource = null
  }

  /**
   * Open (or re‑open) the SSE connection.
   *
   * The token is passed as a query parameter because the browser's native
   * EventSource API does not support custom HTTP headers.  The backend
   * reads it from the query string in addition to the Authorization header.
   */
  function connect(): EventSource {
    // Close any existing connection first.
    if (eventSource) {
      cleanup()
    }

    const url = new URL('/analytics/realtime', baseUrl)
    url.searchParams.set('token', token)

    eventSource = new EventSource(url.toString())

    // Handle the initial `connected` event (named SSE event).
    eventSource.addEventListener('connected', () => {
      handlers.onConnected?.()
    })

    // Handle unnamed `data:` events pushed by the realtime service.
    // The backend publishes messages in the format:
    //   data: {"type":"event","payload":{...}}
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type: string
          payload: RealtimeEventPayload
        }

        if (parsed.type === 'event' && parsed.payload) {
          handlers.onMessage?.(parsed.payload)
        }
      } catch {
        // Silently ignore malformed JSON — the stream may include
        // other SSE messages that don't parse as our event shape.
      }
    }

    // Forward errors to the caller.
    eventSource.onerror = (err: Event) => {
      handlers.onError?.(err)
    }

    return eventSource
  }

  /**
   * Close the SSE connection and clean up all listeners.
   *
   * After this call, no further callbacks will fire and the EventSource
   * is fully garbage‑collectable.
   */
  function disconnect(): void {
    cleanup()
  }

  return { connect, disconnect }
}


