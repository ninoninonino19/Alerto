import { unstable_cache } from "next/cache";
import { buildAdvisories, type Advisory } from "../advisories";
import type { HeatBand } from "../heat-index";
import type { RainBand } from "../rainfall";
import type { Snapshot } from "../open-meteo";
import { AdviceUnavailableError, generateItems } from "./gemini";
import { buildPrompt } from "./prompt";
import { contextFrom, contextKey, type AdviceContext } from "./context";
import {
  ICONS,
  MAX_DETAIL,
  MAX_ITEMS,
  MAX_TITLE,
  URGENCIES,
  type AdviceResult,
  type ModelItem,
} from "./types";

export type { AdviceResult } from "./types";

/**
 * Advice depends on the situation, not on the place.
 *
 * Five heat bands, four rainfall bands, four parts of the day and three
 * escalation states. That is a few hundred possible situations at the absolute
 * limit, and in practice a handful a day, because only the current one is ever
 * asked for. Cached, the feature costs the same whether ten people load it or
 * ten thousand. Putting the live readings in the key instead would have tied
 * spend to traffic, so the exact numbers stay in the status band where they are
 * never stale.
 */
/*
 * Bump this whenever the prompt, the schema, or the model list changes.
 *
 * The cache is keyed on the situation, which is what keeps the cost flat, and
 * that also means a cached answer outlives the prompt that produced it. Editing
 * the prompt and seeing no change for six hours is not a subtle failure to
 * debug, it just looks like the edit did nothing.
 */
const RECIPE_VERSION = 2;

function situationKey(heat: HeatBand, rain: RainBand, context: AdviceContext): string {
  return `v${RECIPE_VERSION}:${heat.level}:${rain.level}:${contextKey(context)}`;
}

/** Short enough that the part of day is still true when it is served. */
const CACHE_SECONDS = 21600;

/**
 * Anything a model returns is treated as untrusted input.
 *
 * The schema constrains shape; this constrains content. Items with an unknown
 * urgency or icon are dropped rather than coerced, because a guess here would
 * put a rainfall icon on a heat instruction and quietly mislead.
 */
function sanitise(items: ModelItem[]): Advisory[] {
  const clean: Advisory[] = [];

  items.forEach((item, index) => {
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    const detail = typeof item?.detail === "string" ? item.detail.trim() : "";
    if (!title || !detail) return;
    if (!URGENCIES.includes(item.urgency)) return;

    /*
     * An unknown icon no longer discards the item.
     *
     * It used to, on the grounds that a rainfall symbol on a heat instruction
     * would mislead. The cards do not show icons any more, so that reasoning is
     * gone and dropping sound advice over an invisible field would be the only
     * harm left. Urgency still discards, because it decides the ordering and
     * the prominence a reader actually sees.
     */
    const icon = ICONS.includes(item.icon) ? item.icon : "health";

    clean.push({
      id: `generated-${index}`,
      urgency: item.urgency,
      icon,
      title: title.slice(0, MAX_TITLE),
      detail: detail.slice(0, MAX_DETAIL),
      source: icon === "water" || icon === "drive" ? "rain" : "heat",
    });
  });

  const rank = { "act-now": 0, prepare: 1, advice: 2 } as const;
  return clean.sort((a, b) => rank[a.urgency] - rank[b.urgency]).slice(0, MAX_ITEMS);
}

async function callModel(
  heat: HeatBand,
  rain: RainBand,
  baseline: Advisory[],
  context: AdviceContext,
): Promise<Advisory[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AdviceUnavailableError("No GEMINI_API_KEY is configured.");

  const items = await generateItems(buildPrompt(heat, rain, baseline, context), apiKey);
  const clean = sanitise(items);

  // An empty baseline legitimately produces an empty list. A non-empty one that
  // survives validation as empty means the response was unusable.
  if (clean.length === 0 && baseline.length > 0) {
    throw new AdviceUnavailableError("Nothing in the response survived validation.");
  }
  return clean;
}

/**
 * Contextual advice for the current hazard state.
 *
 * Never throws. A dashboard people may act on has to show advice even when the
 * model is rate limited, slow, or unconfigured, so every failure path lands on
 * the deterministic PAGASA rules that were already there.
 */
export async function getAdvice(snapshot: Snapshot): Promise<AdviceResult> {
  const { heat, rain } = snapshot;
  const baseline = buildAdvisories(heat, rain);
  const context = contextFrom(snapshot);
  const key = situationKey(heat, rain, context);

  try {
    const cached = unstable_cache(() => callModel(heat, rain, baseline, context), ["advice", key], {
      revalidate: CACHE_SECONDS,
      tags: ["advice"],
    });
    return { items: await cached(), source: "generated" };
  } catch (error) {
    /*
     * Always say why, even for the expected failures.
     *
     * These were being swallowed on the grounds that a reader does not need to
     * see them, which is true and also made the fallback impossible to debug:
     * the panel simply read "Standard PAGASA guidance" with no clue whether the
     * key was missing, the model deprecated, or the request malformed.
     */
    const reason = error instanceof Error ? error.message : String(error);
    const expected = error instanceof AdviceUnavailableError;
    console[expected ? "warn" : "error"](
      `[advice] falling back to PAGASA rules for ${key}: ${reason}`,
    );
    return { items: baseline, source: "rules" };
  }
}

export { sanitise as sanitiseForTests };
