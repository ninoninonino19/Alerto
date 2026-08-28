/**
 * Correctness checks for the hazard maths and the advice it drives.
 *
 * Run with: npm test
 *
 * The heat index cases are published National Weather Service table values.
 * They matter because the Rothfusz regression has three branches (the dry-air
 * correction, the humid-air correction, and the low-range Steadman fallback)
 * and a normal day in Lucban only ever exercises one of them.
 */

import { heatIndexC, classifyHeat, cToF, fToC, HEAT_BANDS } from "../lib/heat-index";
import { classifyRain, threeHourConcern, RAIN_BANDS } from "../lib/rainfall";
import { buildAdvisories } from "../lib/advisories";

let fails = 0;

function near(label: string, got: number, want: number, tol: number) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}: got ${got.toFixed(2)}, want ~${want}`);
}

function eq(label: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}: got ${got}, want ${want}`);
}

const band = (level: string) => HEAT_BANDS.find((b) => b.level === level)!;
const rain = (level: string) => RAIN_BANDS.find((b) => b.level === level)!;

console.log("\nHeat index against NWS reference values");
near("90F at 70%", cToF(heatIndexC(fToC(90), 70)), 105, 1.5);
near("100F at 40%", cToF(heatIndexC(fToC(100), 40)), 109, 1.5);
near("86F at 90% (humid correction)", cToF(heatIndexC(fToC(86), 90)), 105, 2);
near("110F at 10% (dry correction)", cToF(heatIndexC(fToC(110), 10)), 105, 2);
near("80F at 40% (fallback range)", cToF(heatIndexC(fToC(80), 40)), 80, 1.5);
near("20C at 50% stays near air temperature", heatIndexC(20, 50), 20, 2);

console.log("\nPAGASA heat thresholds");
eq("26.9C", classifyHeat(26.9).label, "Not hazardous");
eq("27.0C", classifyHeat(27).label, "Caution");
eq("32.9C", classifyHeat(32.9).label, "Caution");
eq("33.0C", classifyHeat(33).label, "Extreme Caution");
eq("41.9C", classifyHeat(41.9).label, "Extreme Caution");
eq("42.0C", classifyHeat(42).label, "Danger");
eq("51.9C", classifyHeat(51.9).label, "Danger");
eq("52.0C", classifyHeat(52).label, "Extreme Danger");

console.log("\nPAGASA rainfall thresholds");
eq("7.4 mm/h", classifyRain(7.4).label, "No warning");
eq("7.5 mm/h", classifyRain(7.5).label, "Yellow");
eq("15 mm/h", classifyRain(15).label, "Orange");
eq("30 mm/h", classifyRain(30).label, "Red");
eq("64 mm over 3h", threeHourConcern(64), false);
eq("65 mm over 3h", threeHourConcern(65), true);

console.log("\nAdvice generation");
eq("calm conditions produce no advice", buildAdvisories(band("safe"), rain("none")).length, 0);
eq(
  "extreme danger leads with an immediate action",
  buildAdvisories(band("extreme-danger"), rain("none"))[0].urgency,
  "act-now",
);

// A red rainfall warning outranks a mere heat Caution, so evacuation advice
// must sort above the reminder to drink water.
const mixed = buildAdvisories(band("caution"), rain("red"));
eq("rainfall outranks heat when more severe", mixed[0].source, "rain");
eq("most urgent item is first", mixed[0].urgency, "act-now");

// The reverse: heat Danger against a mild Yellow rain advisory.
const heatLed = buildAdvisories(band("danger"), rain("yellow"));
eq("heat leads when more severe", heatLed[0].source, "heat");

const urgencyRank = { "act-now": 0, prepare: 1, advice: 2 } as const;
const sorted = mixed.every(
  (item, i) => i === 0 || urgencyRank[mixed[i - 1].urgency] <= urgencyRank[item.urgency],
);
eq("advice never sorts above an immediate action", sorted, true);

// Every visible advisory string is checked for the dashes that should not ship.
const allCopy = [
  ...HEAT_BANDS.flatMap((b) => [b.label, b.effect, b.rangeLabel]),
  ...RAIN_BANDS.flatMap((b) => [b.label, b.effect, b.rangeLabel]),
  ...buildAdvisories(band("extreme-danger"), rain("red")).flatMap((a) => [a.title, a.detail]),
].join(" ");
eq("no em or en dashes in advisory copy", /[\u2013\u2014]/.test(allCopy), false);

console.log(fails === 0 ? "\nAll checks passed.\n" : `\n${fails} check(s) failed.\n`);
process.exit(fails === 0 ? 0 : 1);
