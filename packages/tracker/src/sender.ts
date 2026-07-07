import type { ClientEventPayload, InitConfig } from "./types";

export async function postEvent(config: InitConfig, payload: ClientEventPayload): Promise<void> {
  // Backend middleware expects api_token in the request body.
  const body = {
    api_token: config.apiToken,
    ...payload,
  };

  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Preserve minimal behavior: surface status and response text for debugging.
    const text = await res.text().catch(() => "");
    throw new Error(`Tracker SDK: POST ${config.endpoint} failed (${res.status}): ${text}`);
  }
}

