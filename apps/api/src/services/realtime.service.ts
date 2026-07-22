import type { Response } from "express";

/**
 * PulseKit Realtime Service (Phase 7A)
 *
 * Workspace-scoped in-memory pub/sub using Express Response objects.
 *
 * Why Response objects instead of an abstract Subscriber interface?
 * - Phase 7B will add an SSE endpoint that writes to Response streams.
 * - Wrapping Response directly avoids an abstraction layer that would
 *   immediately be replaced when SSE is implemented.
 * - Response provides built-in disconnect detection via the `close` event,
 *   which we use for automatic cleanup.
 *
 * Zero external dependencies — pure Node.js / Express types only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Lightweight shape of an event delivered over SSE.
 *
 * We deliberately use a subset of the Prisma Event model to avoid coupling
 * the realtime layer to the full database row shape.  Additional fields can
 * be added here as needed without touching Prisma.
 */
export interface RealtimeEventPayload {
  id: string;
  event_id: string;
  event_type: string;
  timestamp: Date;
  url: string;
  properties: unknown;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * Workspace-scoped subscriber registry.
 *
 * Map<workspaceId, Set<Response>>
 *
 * Each workspace has a set of active SSE Response streams.
 * Using Set guarantees O(1) add / delete and prevents double-registration.
 */
const subscribers = new Map<string, Set<Response>>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely format an SSE‑formatted JSON message.
 *
 * Using the standard SSE `data:` prefix followed by a double newline.
 * This is the most portable format and works with the browser EventSource API
 * (which will be used in Phase 7B).
 */
function formatSSEMessage(event: RealtimeEventPayload): string {
  const data = JSON.stringify({
    type: "event",
    payload: {
      id: event.id,
      event_id: event.event_id,
      event_type: event.event_type,
      timestamp: event.timestamp,
      url: event.url,
      properties: event.properties,
    },
  });

  return `data: ${data}\n\n`;
}

/**
 * Remove a disconnected Response from the workspace set.
 *
 * Called when:
 * 1) The client closes the connection (via `res.on("close")`).
 * 2) publish() detects a stale stream.
 *
 * The Set is cleaned up lazily — if it becomes empty the map entry is
 * deleted to avoid memory leaks from dead keys.
 */
function removeSubscriber(workspaceId: string, res: Response): void {
  const subs = subscribers.get(workspaceId);
  if (!subs) return;

  subs.delete(res);

  if (subs.size === 0) {
    subscribers.delete(workspaceId);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register an SSE Response stream for a workspace.
 *
 * The caller (SSE route in Phase 7B) is responsible for:
 * - Setting the correct SSE headers (Content-Type, Cache-Control, etc.).
 * - Keeping the response open.
 *
 * Automatic cleanup:
 * We attach a one‑shot `close` listener that removes the Response from the
 * registry when the client disconnects.  This prevents memory leaks without
 * requiring the caller to remember to call unsubscribe().
 */
export function subscribe(workspaceId: string, res: Response): void {
  let subs = subscribers.get(workspaceId);

  if (!subs) {
    subs = new Set<Response>();
    subscribers.set(workspaceId, subs);
  }

  subs.add(res);

  // Register one‑shot cleanup on client disconnect.
  // The `once` ensures the handler runs at most once, preventing leaks if
  // the `close` event is emitted multiple times.
  res.once("close", () => {
    removeSubscriber(workspaceId, res);
  });
}

/**
 * Explicitly remove an SSE Response from a workspace.
 *
 * This is public for testing / admin purposes.  In normal operation
 * unsubscribe happens automatically via the `close` event set up in
 * subscribe().
 */
export function unsubscribe(workspaceId: string, res: Response): void {
  removeSubscriber(workspaceId, res);
}

/**
 * Publish a realtime event notification to all connected SSE clients in a
 * workspace.
 *
 * Behaviour:
 * 1. Iterates all Responses registered for the workspace.
 * 2. Writes SSE‑formatted JSON to each.
 * 3. Lazily evicts any Response whose `writableEnded` is true (client
 *    disconnected without a clean `close` event).
 *
 * This is a fire‑and‑forget operation.  Errors writing to a single client do
 * not bubble up — they trigger eviction of that client only.
 */
export function publish(
  workspaceId: string,
  event: RealtimeEventPayload,
): void {
  const subs = subscribers.get(workspaceId);
  if (!subs || subs.size === 0) return;

  const message = formatSSEMessage(event);

  // Iterate over a snapshot to allow safe mutation during iteration.
  for (const res of Array.from(subs)) {
    // Lazy eviction: if the response has already ended (e.g. the client
    // disconnected without a clean close event), remove it.
    if (res.writableEnded) {
      removeSubscriber(workspaceId, res);
      continue;
    }

    try {
      res.write(message);
    } catch {
      // Writing failed — the stream is probably broken.  Evict.
      removeSubscriber(workspaceId, res);
    }
  }
}

/**
 * Return the current subscriber count (useful for health checks / debugging).
 */
export function getSubscriberCount(workspaceId: string): number {
  return subscribers.get(workspaceId)?.size ?? 0;
}

