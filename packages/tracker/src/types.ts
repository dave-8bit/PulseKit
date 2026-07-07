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
}

export type TrackEventType = CoreEventType;

export interface InitConfig {
  apiToken: string;
  endpoint: string;
}

