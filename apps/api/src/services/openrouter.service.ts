import "dotenv/config";

export type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterChatCompletionRequest = {
  messages: OpenRouterChatMessage[];
};

export type OpenRouterChatCompletionResponse = {
  content: string;
};

export async function createOpenRouterChatCompletion(
  req: OpenRouterChatCompletionRequest
): Promise<OpenRouterChatCompletionResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) throw new Error("OPENROUTER_API_KEY_MISSING");
  if (!model) throw new Error("OPENROUTER_MODEL_MISSING");

  const url = "https://openrouter.ai/api/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: req.messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OPENROUTER_REQUEST_FAILED (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OPENROUTER_EMPTY_RESPONSE");

  return { content };
}

