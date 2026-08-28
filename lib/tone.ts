import type { CSSProperties } from "react";
import type { HeatLevel } from "./heat-index";
import type { RainLevel } from "./rainfall";

/**
 * Both hazards share one five-stop ramp. Mapping level to tone in a single
 * place is what keeps a heat "Danger" and a rainfall "Red" reading as the same
 * severity everywhere in the interface.
 */
export type Tone = "neutral" | "warn" | "high" | "severe" | "extreme";

export const HEAT_TONE: Record<HeatLevel, Tone> = {
  safe: "neutral",
  caution: "warn",
  "extreme-caution": "high",
  danger: "severe",
  "extreme-danger": "extreme",
};

export const RAIN_TONE: Record<RainLevel, Tone> = {
  none: "neutral",
  yellow: "warn",
  orange: "high",
  red: "severe",
};

/**
 * Binds the ramp stop to local custom properties so a subtree can style itself
 * with `var(--tone-surface)` and stay correct in both colour schemes.
 */
export function toneStyle(tone: Tone): CSSProperties {
  return {
    "--tone": `var(--hz-${tone})`,
    "--tone-surface": `var(--hz-${tone}-surface)`,
    "--tone-text": `var(--hz-${tone}-text)`,
    "--tone-edge": `var(--hz-${tone}-edge)`,
  } as CSSProperties;
}
