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

type OpenRouterErrorResponse = {
  error?: {
    message?: string;
    type?: string;
  };
};

function parseFallbackModels(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildOrderedUniqueModels(): string[] {
  const primary = process.env.OPENROUTER_MODEL;
  if (!primary) throw new Error("OPENROUTER_MODEL_MISSING");

  const fallbacks = parseFallbackModels(process.env.OPENROUTER_FALLBACK_MODELS);
  const ordered = [primary, ...fallbacks];

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const m of ordered) {
    if (!seen.has(m)) {
      seen.add(m);
      deduped.push(m);
    }
  }
  return deduped;
}

function isRetryableStatus(status: number | undefined): boolean {
  if (!status) return false;
  if (status === 429) return true;
  if (status === 408) return true;
  // Treat 5xx as temporary/provider overload.
  if (status >= 500 && status <= 599) return true;
  return false;
}

async function readProviderMessage(res: Response): Promise<string> {
  // Prefer structured OpenRouter error message if available.
  try {
    const json = (await res.json().catch(() => null)) as OpenRouterErrorResponse | null;
    const msg = json?.error?.message;
    if (msg) return msg;
  } catch {
    // ignore
  }
  return (await res.text().catch(() => "")).trim();
}

export async function createOpenRouterChatCompletion(
  req: OpenRouterChatCompletionRequest
): Promise<OpenRouterChatCompletionResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY_MISSING");

  const modelsToTry = buildOrderedUniqueModels();
  const url = "https://openrouter.ai/api/v1/chat/completions";

  const baseBody = {
    messages: req.messages,
    max_tokens: 256,
  };

  const attempts: Array<{
    model: string;
    status?: number;
    providerMessage: string;
    retryable: boolean;
    finalFailureReason: string;
  }> = [];

  let lastFailure: Error | undefined;

  for (const model of modelsToTry) {
    // Reuse the exact same request body; only 'model' changes.
    const body = {
      ...baseBody,
      model,
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const status = res.status;
        const providerMessage = await readProviderMessage(res);
        const retryable = isRetryableStatus(status);

        attempts.push({
          model,
          status,
          providerMessage,
          retryable,
          finalFailureReason: `OPENROUTER_REQUEST_FAILED (${status})`,
        });

        if (retryable) {
          // Temporary failure: try next model (requirement says attempt each model sequentially).
          // Do not reattempt the same model indefinitely.
          lastFailure = new Error(
            `OpenRouter temporary failure for model ${model} (${status}): ${providerMessage}`
          );
          continue;
        }

        // Non-retryable 4xx: stop early because retrying won't help.
        throw new Error(
          `OpenRouter non-retryable failure for model ${model} (${status}): ${providerMessage}`
        );
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OPENROUTER_EMPTY_RESPONSE");
      }

      return { content };
    } catch (err) {
      // Network/transport errors are treated as temporary/retryable.
      const message = err instanceof Error ? err.message : String(err);
      const providerMessage = message;

      attempts.push({
        model,
        status: undefined,
        providerMessage,
        retryable: true,
        finalFailureReason: message || "UNKNOWN_ERROR",
      });

      lastFailure = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  const rendered = attempts
    .map((a, idx) => {
      const statusPart = a.status ? `HTTP ${a.status}` : "HTTP ?";
      const providerMsg = a.providerMessage ? `provider: ${a.providerMessage}` : "provider: <empty>";
      return `${idx + 1}. model=${a.model} | ${statusPart} | ${providerMsg}`;
    })
    .join("\n");

  throw new Error(
    `OPENROUTER_ALL_MODELS_FAILED\nFallback order tried: ${modelsToTry.join(", ")}\n${rendered}\nFinal reason: ${lastFailure?.message ?? "UNKNOWN"}`
  );
}


