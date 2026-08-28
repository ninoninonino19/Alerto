import type { Snapshot } from "../open-meteo";
import { findEscalation } from "../projection";
import { hourNumber } from "../format";

/**
 * The situation, coarsened on purpose.
 *
 * Advice is cached per situation, so anything that goes into it also multiplies
 * the number of model calls. Exact readings would make the cache useless and
 * tie spend to traffic, which is the trap the map was designed to avoid.
 *
 * These two survive the coarsening because they change what somebody should
 * actually do. "Move work off midday" is different advice at six in the morning
 * than at eight at night, and knowing that conditions worsen within the window
 * turns a suggestion into a deadline. The live numbers stay in the status band
 * where they are never stale.
 */
export type AdviceContext = {
  partOfDay: "early morning" | "morning" | "afternoon" | "evening";
  worsening: "heat" | "rain" | null;
};

export function contextFrom(snapshot: Snapshot): AdviceContext {
  const hour = hourNumber(snapshot.observedAt);
  const partOfDay =
    hour < 6 ? "early morning" : hour < 11 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const escalation = findEscalation(snapshot);
  return { partOfDay, worsening: escalation ? escalation.kind : null };
}

/** Four parts of day and three escalation states, so the cache stays small. */
export function contextKey(context: AdviceContext): string {
  return `${context.partOfDay}:${context.worsening ?? "steady"}`;
}
