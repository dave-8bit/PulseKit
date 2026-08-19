import { CoreEventType, type CoreEventProperties } from "../event.contract";

/**
 * Client-facing payload the browser/SDK sends to the backend.
 * IMPORTANT: never include workspace_id.
 */

export interface ClientEventPayload {
  event_id: string;
  event_type: CoreEventType;
  timestamp: string;
  url: string;
  user_agent: string;
  properties: CoreEventProperties;

  /**
   * Optional session identifier.
   * Supplied by the tracker when session tracking is active.
   */
  session_id?: string;

  /**
   * Optional anonymous identifier for session grouping.
   * Derived by the tracker and opaque to the server.
   */
  anonymous_id?: string;
}

export type TrackEventType = CoreEventType;

export interface InitConfig {
  apiToken: string;
  endpoint: string;
}

