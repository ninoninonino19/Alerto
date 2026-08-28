import { ICONS, MAX_ITEMS, URGENCIES, type ModelItem } from "./types";

/**
 * Structured output, so the response is parsed rather than scraped.
 *
 * Gemini enforces this schema itself, which removes most of the ways a free
 * text reply can go wrong. The validation on the way out still runs, because a
 * schema constrains shape and says nothing about whether the content is sane.
 */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          urgency: { type: "string", enum: URGENCIES },
          icon: { type: "string", enum: ICONS },
        },
        // Keeps the model writing the action before the reasoning, which is the
        // order the fields are meant to be filled in.
        propertyOrdering: ["title", "detail", "urgency", "icon"],
        required: ["title", "detail", "urgency", "icon"],
      },
    },
  },
  required: ["items"],
} as const;

/*
 * Two models, tried in order.
 *
 * Both are aliases rather than pinned versions, because pinning is what broke
 * this the first time: gemini-2.5-flash still appears in the model list and
 * answers 404 for new keys.
 *
 * The lite model leads because the free tier meters it more generously and it
 * answers faster, and this is a rewriting job rather than a reasoning one. The
 * second is a different model, not a retry of the first, which is the point:
 * Gemini counts rate limits per model, so a throttled lite tier does not mean a
 * throttled flash tier.
 */
const MODELS = (process.env.GEMINI_MODELS ?? "gemini-flash-lite-latest,gemini-3.6-flash")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

/** A slow model must not hold up a page that already has its readings. */
const TIMEOUT_MS = 12000;

/** Statuses where trying the next model is worth a moment; anything else is not. */
const WORTH_RETRYING = new Set([429, 500, 502, 503, 504]);

export class AdviceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdviceUnavailableError";
  }
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

async function callOnce(model: string, prompt: string, apiKey: string): Promise<ModelItem[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The key travels in a header rather than the query string so it does
        // not end up in request logs or referrers.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // Low but not zero: the wording may vary, the substance may not.
          temperature: 0.3,
          maxOutputTokens: 2000,
          /*
           * Gemini 3 renamed this. The 2.x form, thinkingConfig.thinkingBudget,
           * is rejected outright with a 400 rather than ignored. Low is right
           * for what this is: rewriting supplied text, not reasoning.
           */
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    // A timeout is worth trying the next model for; a network failure is not.
    throw Object.assign(
      new AdviceUnavailableError(`${model} ${timedOut ? "timed out" : "failed"}.`),
      {
        retryable: timedOut,
      },
    );
  }

  if (!response.ok) {
    throw Object.assign(new AdviceUnavailableError(`${model} returned ${response.status}.`), {
      retryable: WORTH_RETRYING.has(response.status),
    });
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AdviceUnavailableError(`${model} returned no content.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AdviceUnavailableError(`${model} returned unparsable JSON.`);
  }

  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items)) throw new AdviceUnavailableError(`${model} returned no items array.`);

  return items.slice(0, MAX_ITEMS) as ModelItem[];
}

/**
 * One set of items, from whichever model answers first.
 *
 * Throws rather than returning a partial result, because the caller has a
 * complete deterministic answer to fall back to.
 */
export async function generateItems(prompt: string, apiKey: string): Promise<ModelItem[]> {
  let last: unknown;

  for (const model of MODELS) {
    try {
      return await callOnce(model, prompt, apiKey);
    } catch (error) {
      last = error;
      const retryable = (error as { retryable?: boolean }).retryable === true;
      if (!retryable) break;
      console.warn(`[advice] ${(error as Error).message} Trying the next model.`);
    }
  }

  throw last instanceof Error ? last : new AdviceUnavailableError("No model answered.");
}
