/**
 * PAGASA rainfall warning classification.
 *
 * Thresholds are hourly observed or expected rainfall. The agency issues these
 * as colour-coded advisories, so the level names below are the colours
 * themselves. They are always paired with a written label in the interface,
 * never carried by colour alone.
 */

export type RainLevel = "none" | "yellow" | "orange" | "red";

export type RainBand = {
  level: RainLevel;
  label: string;
  /** Inclusive lower bound in millimetres per hour. */
  from: number;
  /** Exclusive upper bound in mm/h, null for the open top band. */
  to: number | null;
  rangeLabel: string;
  effect: string;
};

export const RAIN_BANDS: RainBand[] = [
  {
    level: "none",
    label: "No warning",
    from: 0,
    to: 7.5,
    rangeLabel: "under 7.5 mm/h",
    effect: "Rainfall is below the advisory threshold.",
  },
  {
    level: "yellow",
    label: "Yellow",
    from: 7.5,
    to: 15,
    rangeLabel: "7.5 to 15 mm/h",
    effect: "Flooding is possible in low-lying areas and near river channels.",
  },
  {
    level: "orange",
    label: "Orange",
    from: 15,
    to: 30,
    rangeLabel: "15 to 30 mm/h",
    effect: "Flooding is threatening. Communities should be alert for possible evacuation.",
  },
  {
    level: "red",
    label: "Red",
    from: 30,
    to: null,
    rangeLabel: "over 30 mm/h",
    effect: "Serious flooding is expected in low-lying areas. Evacuation is warranted.",
  },
];

export function classifyRain(millimetresPerHour: number): RainBand {
  for (const band of RAIN_BANDS) {
    if (band.to === null || millimetresPerHour < band.to) return band;
  }
  return RAIN_BANDS[RAIN_BANDS.length - 1];
}

export const RAIN_SEVERITY: Record<RainLevel, number> = {
  none: 0,
  yellow: 2,
  orange: 3,
  red: 4,
};

/**
 * Three-hour accumulation is the second half of the red criterion. It is
 * tracked separately because a slow, steady band of rain can flood a barangay
 * without ever crossing the hourly threshold.
 */
export function threeHourConcern(accumulation: number): boolean {
  return accumulation >= 65;
}
