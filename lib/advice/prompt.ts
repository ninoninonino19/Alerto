import type { HeatBand } from "../heat-index";
import type { RainBand } from "../rainfall";
import type { Advisory } from "../advisories";
import type { AdviceContext } from "./context";
import { ICONS, MAX_DETAIL, MAX_ITEMS, MAX_TITLE, URGENCIES } from "./types";

/**
 * The prompt is narrow about danger and generous about practicality.
 *
 * The model is not asked to decide whether anything is hazardous. That is
 * settled by the PAGASA thresholds before this function is called, and the
 * rules below are the approved response to the exact situation.
 *
 * What changed from the first version is the line between the two. Forbidding
 * the model from adding anything at all produced advice that named an action
 * and never said how to carry it out, which is most of what makes advice
 * useful. It may now elaborate on an approved action with practical, everyday
 * detail. It still may not introduce a new kind of action, imply a different
 * hazard level, or raise evacuation on its own, because those are claims about
 * danger rather than help with an instruction already given.
 */
export function buildPrompt(
  heat: HeatBand,
  rain: RainBand,
  baseline: Advisory[],
  context: AdviceContext,
): string {
  const rules = baseline
    .map((item) => `- [${item.urgency}, ${item.icon}] ${item.title}: ${item.detail}`)
    .join("\n");

  const worsening =
    context.worsening === "heat"
      ? "The heat index is forecast to reach a worse level later in the day."
      : context.worsening === "rain"
        ? "Rainfall is forecast to reach a worse warning level later in the day."
        : "Neither hazard is forecast to worsen beyond its current level today.";

  return [
    "You are writing public safety advice for Alerto, a Philippine heat and rainfall dashboard.",
    "Your readers are ordinary residents: parents, outdoor workers, drivers, students, barangay staff.",
    "Name who an instruction is for inside the sentence itself when it matters.",
    "",
    "SITUATION, already classified against official PAGASA thresholds:",
    `- Heat index level: ${heat.label} (${heat.rangeLabel}). ${heat.effect}`,
    `- Rainfall level: ${rain.label} (${rain.rangeLabel}). ${rain.effect}`,
    `- It is currently ${context.partOfDay} in the Philippines.`,
    `- ${worsening}`,
    "",
    "APPROVED ACTIONS FOR THIS EXACT SITUATION:",
    rules || "- No advisory is in effect. Normal activity can continue.",
    "",
    "YOUR TASK:",
    "Turn the approved actions into advice somebody can follow without thinking twice.",
    "For each one, say plainly what to do, and add the practical detail the bare",
    "instruction leaves out: how much, how often, what to use, what to watch for,",
    "what to do instead. Prefer things available in an ordinary Filipino household.",
    "Merge overlapping heat and rainfall actions into one instruction rather than",
    "repeating them. Use the time of day and whether conditions are worsening to",
    "make the timing concrete. Keep the calm register of a public advisory and",
    "address the reader directly as you.",
    "",
    "WHAT YOU MAY ADD:",
    "Practical elaboration on an approved action. Everyday specifics that make it",
    "easier to follow. Plain explanation of why it matters, drawn from the effects above.",
    "",
    "WHAT YOU MAY NOT ADD:",
    "1. A new kind of action that no approved action implies.",
    "2. Any hazard level other than the two stated, or any claim about how bad it will get.",
    "3. Evacuation, unless an approved action already says to evacuate.",
    "4. Invented numbers, statistics, temperatures, or rainfall figures.",
    "5. Named agencies, hotlines, places, or medical claims beyond the effects above.",
    "",
    "FORMAT:",
    `- At most ${MAX_ITEMS} items, most urgent first, one per approved action after merging.`,
    `- title: an imperative under ${MAX_TITLE} characters. Say the action, not the reason.`,
    `- detail: one or two full sentences under ${MAX_DETAIL} characters, concrete and specific.`,
    `- urgency: one of ${URGENCIES.join(", ")}.`,
    `- icon: one of ${ICONS.join(", ")}.`,
    "- Write in English, using Filipino terms only where they are the ordinary word.",
    "- Do not use em dashes.",
    "- If the approved actions are empty, return an empty list.",
  ].join("\n");
}
