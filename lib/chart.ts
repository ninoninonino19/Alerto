import { HEAT_BANDS, type HeatBand } from "./heat-index";
import { RAIN_BANDS, type RainBand } from "./rainfall";
import { HEAT_TONE, RAIN_TONE, type Tone } from "./tone";

/**
 * Geometry for the hazard timeline and the level rail beside it.
 *
 * Both hazards are drawn away from a shared centre line, so the distance from
 * the middle is how hazardous a reading is. A short bar is safe in either
 * direction, which is what lets two different hazards in two different units
 * share one axis.
 */

/*
 * Track heights live in CSS so they can grow with the viewport, and the
 * geometry below is expressed as fractions rather than pixels so nothing here
 * has to know how tall the chart currently is.
 */
export const HEAT_TRACK_VAR = "var(--heat-track)";
export const RAIN_TRACK_VAR = "var(--rain-track)";

/*
 * The ends of both scales are fixed, so a given bar height always means the
 * same thing today, tomorrow, and in any other locality. An axis that refits
 * itself to the day's peak makes those comparisons impossible, and would slide
 * the level rail around under the reader.
 *
 * The heat floor is 20 degrees rather than the 27 where hazard begins. Starting
 * at the hazard threshold sounded principled and drew an empty chart: on an
 * ordinary Philippine day every reading sat within a few percent of the bottom
 * and the whole graph read as blank. Twenty degrees is still unambiguously
 * safe, so the centre line keeps its meaning, and the ordinary range of a day
 * now occupies a readable part of the track.
 */
export const HEAT_BASE = 20;
export const HEAT_TOP = 58;
const RAIN_BASE = 0;
const RAIN_TOP = 40;

/** Thresholds worth drawing across the chart. 27 is where heat hazard begins. */
export const HEAT_GUIDES = [27, 33, 42, 52];
export const RAIN_GUIDES = [7.5, 15, 30];

/** Enough of a mark that a calm hour reads as measured rather than missing. */
export const STUB = 2;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Where a heat index sits on the track, as a fraction from 0 to 1.
 *
 * Linear, because apparent temperature is perceived that way and the bands are
 * evenly spaced enough for it to read honestly.
 */
export function heatFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp01((value - HEAT_BASE) / (HEAT_TOP - HEAT_BASE));
}

/**
 * Where an hourly rainfall sits on the track, as a fraction from 0 to 1.
 *
 * Square root rather than linear. Rainfall spends almost all its time in the
 * low single digits and occasionally reaches thirty, so a linear axis wide
 * enough to show a red warning renders ordinary rain as nothing at all. The
 * square root spreads the bottom of the range without pushing any threshold
 * off the top: 7.5, 15 and 30 mm/h still land at 43, 61 and 87 percent.
 */
export function rainFraction(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return clamp01(Math.sqrt(value / RAIN_TOP));
}

/**
 * Height for a bar, as an absolute length derived from the track variable.
 *
 * This deliberately does not return a percentage. A percentage height resolves
 * against the parent, and the parent here is a flex item that sizes to its own
 * content, so every bar silently collapsed to the minimum and the chart drew as
 * a flat line. Multiplying the CSS variable inside calc() gives a real length
 * that depends on nothing but the variable, so the chart still resizes from CSS
 * alone and the bars cannot be flattened by a layout change somewhere else.
 */
export function barStyle(fraction: number, trackVar: string): { height: string } {
  return { height: `max(${STUB}px, calc(${fraction} * ${trackVar}))` };
}

/** A narrow rail truncates "Extreme Caution" into something unreadable, so the
 * bands get real abbreviations rather than an ellipsis. */
const HEAT_SHORT: Record<string, string> = {
  safe: "Safe",
  caution: "Caution",
  "extreme-caution": "Ext. Caution",
  danger: "Danger",
  "extreme-danger": "Ext. Danger",
};

export type RailSegment = {
  key: string;
  label: string;
  /** Used where the rail is too narrow for the full name to fit. */
  shortLabel: string;
  tone: Tone;
  /** Fraction of the track, measured from the centre line outward. */
  start: number;
  size: number;
};

/**
 * The advisory bands as proportional segments of a track.
 *
 * Positioned with the very same scale function the bars use, so the rail can
 * never disagree with where a bar lands, and derived from the same band tables
 * the classifier uses, so it can never disagree with the level named in the
 * status band.
 */
function segmentsFrom(
  bands: Array<HeatBand | RainBand>,
  toneOf: (level: string) => Tone,
  toFraction: (value: number) => number,
  base: number,
  top: number,
  relabel: (band: HeatBand | RainBand) => string,
  shorten: (band: HeatBand | RainBand) => string,
): RailSegment[] {
  return bands
    .map((band) => {
      const from = Math.max(Number.isFinite(band.from) ? band.from : base, base);
      const to = Math.min(band.to ?? top, top);
      return { band, from, to };
    })
    .filter(({ from, to }) => to > from)
    .map(({ band, from, to }) => ({
      key: band.level,
      label: relabel(band),
      shortLabel: shorten(band),
      tone: toneOf(band.level),
      start: toFraction(from),
      size: toFraction(to) - toFraction(from),
    }));
}

export function heatRailSegments(): RailSegment[] {
  return segmentsFrom(
    HEAT_BANDS,
    (level) => HEAT_TONE[level as keyof typeof HEAT_TONE],
    heatFraction,
    HEAT_BASE,
    HEAT_TOP,
    (band) => (band.level === "safe" ? "Not hazardous" : band.label),
    // A narrow rail truncates "Extreme Caution" into something unreadable, so
    // it gets a real abbreviation rather than an ellipsis.
    (band) => HEAT_SHORT[band.level] ?? band.label,
  );
}

export function rainRailSegments(): RailSegment[] {
  return segmentsFrom(
    RAIN_BANDS,
    (level) => RAIN_TONE[level as keyof typeof RAIN_TONE],
    rainFraction,
    RAIN_BASE,
    RAIN_TOP,
    (band) => (band.label === "No warning" ? "No warning" : `${band.label} warning`),
    (band) => (band.label === "No warning" ? "None" : band.label),
  );
}
