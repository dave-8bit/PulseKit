import type { TrackEventType, ClientEventPayload } from "./types";
import type { CoreEventProperties } from "../event.contract";
import { getConfig } from "./init";
import { generateUuidV4 } from "./uuid";
import { getCurrentUrl, getUserAgent } from "./browser";
import { postEvent } from "./sender";

export async function track(
  event_type: TrackEventType,
  properties: CoreEventProperties = {}
): Promise<void> {
  const cfg = getConfig();

  const payload: ClientEventPayload = {
    event_id: generateUuidV4(),
    event_type,
    timestamp: new Date().toISOString(),
    url: getCurrentUrl(),
    user_agent: getUserAgent(),
    properties,
  };

  await postEvent(cfg, payload);
}


