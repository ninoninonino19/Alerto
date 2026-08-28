/**
 * Heat index computation and PAGASA hazard classification.
 *
 * The Rothfusz regression is defined for Fahrenheit, so raw Celsius readings
 * from Open-Meteo are converted, run through the regression, then converted
 * back. The two Rothfusz adjustments and the low-range Steadman fallback are
 * part of the reference NWS implementation; without them the regression drifts
 * badly below about 27C and in very dry or very humid air.
 */

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

/**
 * Apparent temperature in Celsius, from dry-bulb temperature (C) and
 * relative humidity (%).
 */
export function heatIndexC(temperatureC: number, relativeHumidity: number): number {
  const T = cToF(temperatureC);
  const R = Math.min(100, Math.max(0, relativeHumidity));

  // Steadman's simple form. Accurate under 80F, where the full regression is not.
  const simple = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
  if ((simple + T) / 2 < 80) return fToC(simple);

  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  // Dry air over-predicts, humid air under-predicts. Both corrections are bounded.
  if (R < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (R > 85 && T >= 80 && T <= 87) {
    HI += ((R - 85) / 10) * ((87 - T) / 5);
  }

  return fToC(HI);
}

export type HeatLevel = "safe" | "caution" | "extreme-caution" | "danger" | "extreme-danger";

export type HeatBand = {
  level: HeatLevel;
  /** Short label used in the status band and the ladder. */
  label: string;
  /** Inclusive lower bound in Celsius. */
  from: number;
  /** Exclusive upper bound in Celsius, null for the open top band. */
  to: number | null;
  /** Range as PAGASA prints it, which is not always the arithmetic bound. */
  rangeLabel: string;
  /** PAGASA description of the physiological effect. */
  effect: string;
};

/** PAGASA heat index classification, in degrees Celsius. */
export const HEAT_BANDS: HeatBand[] = [
  {
    level: "safe",
    label: "Not hazardous",
    from: -Infinity,
    to: 27,
    rangeLabel: "below 27\u00b0C",
    effect: "No heat-related hazard is expected at this apparent temperature.",
  },
  {
    level: "caution",
    label: "Caution",
    from: 27,
    to: 33,
    rangeLabel: "27 to 32\u00b0C",
    effect: "Fatigue is possible with prolonged exposure and physical activity.",
  },
  {
    level: "extreme-caution",
    label: "Extreme Caution",
    from: 33,
    to: 42,
    rangeLabel: "33 to 41\u00b0C",
    effect:
      "Heat cramps and heat exhaustion are possible. Continued activity could lead to heat stroke.",
  },
  {
    level: "danger",
    label: "Danger",
    from: 42,
    to: 52,
    rangeLabel: "42 to 51\u00b0C",
    effect:
      "Heat cramps and heat exhaustion are likely. Heat stroke is probable with continued exposure.",
  },
  {
    level: "extreme-danger",
    label: "Extreme Danger",
    from: 52,
    to: null,
    rangeLabel: "52\u00b0C and above",
    effect: "Heat stroke is imminent.",
  },
];

export function classifyHeat(heatIndex: number): HeatBand {
  for (const band of HEAT_BANDS) {
    if (band.to === null || heatIndex < band.to) return band;
  }
  return HEAT_BANDS[HEAT_BANDS.length - 1];
}

/** Severity rank shared with rainfall so the two hazards can be compared. */
export const HEAT_SEVERITY: Record<HeatLevel, number> = {
  safe: 0,
  caution: 1,
  "extreme-caution": 2,
  danger: 3,
  "extreme-danger": 4,
};
