const fs = require("fs");
const p = "tests/rail.test.mts";
let s = fs.readFileSync(p, "utf8");
function sub(a, b) {
  if (!s.includes(a)) { console.error("MISS: " + a.slice(0, 60).replace(/\n/g, " ")); process.exitCode = 1; return; }
  s = s.split(a).join(b);
}

sub(`import {
  HEAT_BASE,
  HEAT_TOP,
  RAIN_BASE,
  RAIN_TOP,
  hazardFraction,
  heatRailSegments,
  rainRailSegments,
} from "../lib/chart";`,
`import { heatFraction, rainFraction, heatRailSegments, rainRailSegments } from "../lib/chart";`);

sub(`eq("no heat segment is the not-hazardous band", heat.some((s) => s.key === "safe"), false);
eq("every heat band above the line is present", heat.length, 4);`,
`// The heat floor now sits below the hazard threshold, so the safe stretch is a
// real part of the track and is drawn rather than collapsed onto the line.
eq("the safe stretch is drawn", heat[0].key, "safe");
eq("every heat band is present", heat.length, 5);`);

sub(`console.log("\nThe safe zone is not drawn as a heat band");`,
    `console.log("\nBands present");`);

sub(`for (const value of [27, 30, 33, 38, 42, 47, 52, 55, 58]) {
  const fraction = hazardFraction(value, HEAT_BASE, HEAT_TOP);
  eq(\`heat \${value} sits in its own band\`, bandAt(heat, fraction).key, classifyHeat(value).level);
}`,
`for (const value of [20, 24, 27, 30, 33, 38, 42, 47, 52, 55, 58]) {
  const fraction = heatFraction(value);
  eq(\`heat \${value} sits in its own band\`, bandAt(heat, fraction).key, classifyHeat(value).level);
}`);

sub(`for (const value of [0, 3, 7.5, 12, 15, 22, 30, 35, 40]) {
  const fraction = hazardFraction(value, RAIN_BASE, RAIN_TOP);
  eq(\`rain \${value} sits in its own band\`, bandAt(rain, fraction).key, classifyRain(value).level);
}`,
`for (const value of [0, 0.9, 3, 7.5, 12, 15, 22, 30, 35, 40]) {
  const fraction = rainFraction(value);
  eq(\`rain \${value} sits in its own band\`, bandAt(rain, fraction).key, classifyRain(value).level);
}`);

sub(`console.log("\nThe scale is fixed, so heights are comparable");
// The same reading must map to the same height regardless of what else is in
// the series, which is the property an auto-ranging axis loses.
eq("35 degrees is always the same height", hazardFraction(35, HEAT_BASE, HEAT_TOP), 8 / 31);
eq("15 mm is always the same height", hazardFraction(15, RAIN_BASE, RAIN_TOP), 0.375);
eq("beyond the top clamps rather than overflowing", hazardFraction(90, HEAT_BASE, HEAT_TOP), 1);`,
`console.log("\nThe scale is fixed, so heights are comparable");
// The same reading must map to the same height regardless of what else is in
// the series, which is the property an auto-ranging axis loses.
eq("35 degrees is always the same height", heatFraction(35), 15 / 38);
eq("15 mm is always the same height", near(rainFraction(15), Math.sqrt(0.375)), true);
eq("beyond the top clamps rather than overflowing", heatFraction(90), 1);`);

fs.writeFileSync(p, s);
console.log("rail test updated");
