/**
 * PulseKit CORE event type system (types-only).
 *
 * This file intentionally contains NO runtime logic.
 * It defines the canonical event shapes shared across the whole system.
 */

/**
 * Supported analytics event types.
 */
export enum CoreEventType {
  page_view = "page_view",
  click = "click",
  custom_event = "custom_event",
}

/**
 * Branded types to keep values strictly typed without runtime validation.
 */
export type UUIDv4 = string & { readonly __brand: "uuidv4" };
export type ISO8601Timestamp = string & { readonly __brand: "iso8601" };
export type EventURL = string & { readonly __brand: "event_url" };

/**
 * Properties bag for future extensibility.
 *
 * - Must remain strictly typed: no `any`.
 * - Accepts untrusted client input safely by keeping the value type
 *   opaque/unknown at this boundary.
 */
export type CoreEventProperties = Record<string, unknown>;

/**
 * Base event shape shared by all core event types.
 */
export interface BaseEvent {
  /** UUID v4 string. */
  event_id: UUIDv4;

  /** Workspace identifier. */
  workspace_id: string;

  /** Discriminator for the event kind. */
  event_type: CoreEventType;

  /** ISO 8601 timestamp string. */
  timestamp: ISO8601Timestamp;

  /** URL associated with the event. */
  url: EventURL;

  /** Client user agent string. */
  user_agent: string;

  /** Extensible, strictly typed properties bag. */
  properties: CoreEventProperties;

  /**
   * Optional session identifier.
   * Supplied by the tracker when session tracking is active.
   */
  session_id?: UUIDv4;

  /**
   * Optional anonymous identifier for session grouping.
   * Derived by the tracker and opaque to the server.
   */
  anonymous_id?: string;
}

/**
 * Canonical union of all core event variants.
 *
 * This remains types-only and enables future extension while preserving
 * the required base fields.
 */
export type CoreEvent = BaseEvent;

