/**
 * Checks for the timeline's bar geometry.
 *
 * Both hazards share one chart and are drawn away from a common centre line, so
 * bar length has to mean the same thing in both directions. A mistake here does
 * not throw or look broken; it quietly draws a safe hour as alarming, or an
 * alarming hour as safe.
 *
 * The readability checks near the bottom exist because the first version of
 * this scale was arithmetically correct and visually blank: it started the heat
 * axis at the hazard threshold, so an ordinary day drew nothing at all.
 */

import { heatFraction, rainFraction, barStyle, STUB, HEAT_BASE, HEAT_TOP } from "../lib/chart";

let fails = 0;

function eq(label: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}: got ${got}, want ${want}`);
}

const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) < tol;

console.log("\nThe centre line is the safe end of both scales");
eq("the heat floor sits on the line", heatFraction(HEAT_BASE), 0);
eq("colder than the floor stays on the line", heatFraction(5), 0);
eq("no rain sits on the line", rainFraction(0), 0);
eq("negative rain is not a thing", rainFraction(-3), 0);

console.log("\nClamping");
eq("beyond the heat top clamps", heatFraction(120), 1);
eq("a torrential hour clamps", rainFraction(500), 1);
eq("the heat top is exactly full", heatFraction(HEAT_TOP), 1);
eq("NaN does not leak into the layout", heatFraction(Number.NaN), 0);
eq("NaN rain does not either", rainFraction(Number.NaN), 0);

console.log("\nAn ordinary Philippine day has to be visible");
// This is the regression that mattered: on the previous scale a 29 degree heat
// index drew at 6% of the track and 0.9 mm of rain at 2%, which read as blank.
eq("a 29 degree heat index is clearly drawn", heatFraction(29) > 0.15, true);
eq("light rain is clearly drawn", rainFraction(0.9) > 0.1, true);
eq("a mild 26 degrees still shows", heatFraction(26) > 0.1, true);
eq("a trace of rain still shows", rainFraction(0.2) > 0.05, true);

console.log("\nEvery threshold stays on the scale");
for (const guide of [27, 33, 42, 52]) {
  const f = heatFraction(guide);
  eq(`heat ${guide} is inside the track`, f > 0 && f < 1, true);
}
for (const guide of [7.5, 15, 30]) {
  const f = rainFraction(guide);
  eq(`rain ${guide} is inside the track`, f > 0 && f < 1, true);
}
// The square root axis has to spread the bottom without crushing the top.
eq("the yellow threshold sits near the middle", near(rainFraction(7.5), 0.433), true);
eq("the red threshold stays high", near(rainFraction(30), 0.866), true);

console.log("\nBar heights");
/*
 * These assert an absolute length rather than a percentage, and that is the
 * whole point. The previous version returned a percentage, which resolves
 * against the parent, and the parent is a flex item that sizes to its own
 * content. Every bar silently collapsed to the minimum and the chart drew as a
 * flat line while the style attribute read perfectly correct.
 */
const TRACK = "var(--heat-track)";
eq(
  "a full bar is the whole track",
  barStyle(1, TRACK).height,
  `max(${STUB}px, calc(1 * ${TRACK}))`,
);
eq("a half bar is half of it", barStyle(0.5, TRACK).height, `max(${STUB}px, calc(0.5 * ${TRACK}))`);
eq(
  "a calm hour falls back to the stub",
  barStyle(0, TRACK).height,
  `max(${STUB}px, calc(0 * ${TRACK}))`,
);
eq("no percentage ever reaches the DOM", barStyle(0.25, TRACK).height.includes("%"), false);
eq("height depends only on the track variable", barStyle(0.25, TRACK).height.includes(TRACK), true);

// Monotonicity is the property a reader actually relies on: worse conditions
// must never draw a shorter bar.
function monotonic(scale: (v: number) => number, from: number, to: number, step: number) {
  let previous = -1;
  for (let v = from; v <= to; v += step) {
    // The multiplier inside calc() is what actually sets the height.
    const factor = Number(barStyle(scale(v), "var(--t)").height.match(/calc\(([\d.]+) /)![1]);
    if (factor < previous) return false;
    previous = factor;
  }
  return true;
}
eq("hotter never draws shorter", monotonic(heatFraction, 5, 70, 0.5), true);
eq("wetter never draws shorter", monotonic(rainFraction, 0, 60, 0.25), true);

console.log(fails === 0 ? "\nAll checks passed.\n" : `\n${fails} check(s) failed.\n`);
process.exit(fails === 0 ? 0 : 1);
