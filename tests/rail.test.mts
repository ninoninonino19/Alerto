/**
 * Checks for the level rail beside the chart.
 *
 * The rail is the chart's axis, so a band drawn in the wrong place is a lie
 * about how close a reading is to the next threshold. These checks tie the
 * drawing back to the same band tables the classifier uses, so the two can
 * never drift apart.
 */

import { heatFraction, rainFraction, heatRailSegments, rainRailSegments } from "../lib/chart";
import { classifyHeat } from "../lib/heat-index";
import { classifyRain } from "../lib/rainfall";

let fails = 0;

function eq(label: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}: got ${got}, want ${want}`);
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const heat = heatRailSegments();
const rain = rainRailSegments();

console.log("\nRail covers the scale exactly");
eq("the heat rail starts at the centre line", near(heat[0].start, 0), true);
eq("the rain rail starts at the centre line", near(rain[0].start, 0), true);

function contiguous(segments: Array<{ start: number; size: number }>) {
  for (let i = 1; i < segments.length; i++) {
    if (!near(segments[i].start, segments[i - 1].start + segments[i - 1].size)) return false;
  }
  return true;
}
eq("heat bands leave no gaps or overlaps", contiguous(heat), true);
eq("rain bands leave no gaps or overlaps", contiguous(rain), true);

const fills = (segments: Array<{ start: number; size: number }>) =>
  near(segments[segments.length - 1].start + segments[segments.length - 1].size, 1);
eq("heat bands reach the top of the scale", fills(heat), true);
eq("rain bands reach the top of the scale", fills(rain), true);

console.log("\nBands present");
// The heat floor now sits below the hazard threshold, so the safe stretch is a
// real part of the track and is drawn rather than collapsed onto the line.
eq("the safe stretch is drawn", heat[0].key, "safe");
eq("every heat band is present", heat.length, 5);
// Rain does have a real no-warning magnitude below the line, so it keeps its band.
eq("rain keeps its no-warning band", rain[0].key, "none");
eq("every rain band is present", rain.length, 4);

console.log("\nA marker lands inside the band the classifier names");
function bandAt(segments: typeof heat, fraction: number) {
  // The topmost band is inclusive of the very top of the scale.
  return (
    segments.find((s) => fraction >= s.start && fraction < s.start + s.size) ??
    segments[segments.length - 1]
  );
}

for (const value of [20, 24, 27, 30, 33, 38, 42, 47, 52, 55, 58]) {
  const fraction = heatFraction(value);
  eq(`heat ${value} sits in its own band`, bandAt(heat, fraction).key, classifyHeat(value).level);
}

for (const value of [0, 0.9, 3, 7.5, 12, 15, 22, 30, 35, 40]) {
  const fraction = rainFraction(value);
  eq(`rain ${value} sits in its own band`, bandAt(rain, fraction).key, classifyRain(value).level);
}

console.log("\nThe scale is fixed, so heights are comparable");
// The same reading must map to the same height regardless of what else is in
// the series, which is the property an auto-ranging axis loses.
eq("35 degrees is always the same height", heatFraction(35), 15 / 38);
eq("15 mm is always the same height", near(rainFraction(15), Math.sqrt(0.375)), true);
eq("beyond the top clamps rather than overflowing", heatFraction(90), 1);

console.log(fails === 0 ? "\nAll checks passed.\n" : `\n${fails} check(s) failed.\n`);
process.exit(fails === 0 ? 0 : 1);
