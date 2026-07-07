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

import type { Prisma } from "@prisma/client";

/**
 * Properties bag for future extensibility.
 *
 * Uses Prisma-compatible JSON input type so the ingestion layer can be
 * stored without additional casting.
 */
export type CoreEventProperties = Prisma.InputJsonValue;




/**
 * Base event shape shared by all core event types.
 */
/**
 * Client-facing event shape (what the SDK/browser sends).
 *
 * IMPORTANT: this must NOT contain workspace_id.
 */
export interface ClientEvent {
  /** UUID v4 string. */
  event_id: UUIDv4;

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
}

/**
 * Internal persisted event shape (what the server stores).
 */
export interface InternalEvent extends ClientEvent {
  /** Workspace identifier (derived exclusively from api token). */
  workspace_id: string;
}

/**
 * Backwards-compatible alias for internal persisted events.
 */
export type CoreEvent = InternalEvent;


