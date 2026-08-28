const fs = require("fs");
const p = "tests/chart.test.mts";
let s = fs.readFileSync(p, "utf8");
function sub(a, b) {
  if (!s.includes(a)) { console.error("MISS: " + a.slice(0, 60).replace(/\n/g, " ")); process.exitCode = 1; return; }
  s = s.split(a).join(b);
}

sub(`import { hazardFraction, barHeight } from "../lib/chart";`,
    `import { hazardFraction, barStyle, STUB } from "../lib/chart";`);

sub(`console.log("\nBar heights");
eq("a safe hour still draws a stub", barHeight(0, 112, 2), 2);
eq("a full bar fills the track", barHeight(1, 112, 2), 112);
eq("a half bar is half the track", barHeight(0.5, 112, 2), 56);
eq("the stub wins over a tiny fraction", barHeight(0.001, 112, 2), 2);`,
`console.log("\nBar heights");
// Heights are shares of the track, not pixels, so the chart can be resized in
// CSS alone and every bar stays correct without this maths being touched.
eq("a full bar fills the track", barStyle(1).height, "100%");
eq("a half bar is half the track", barStyle(0.5).height, "50%");
eq("a safe hour asks for no height", barStyle(0).height, "0%");
eq("but still gets a floor so it reads as measured", barStyle(0).minHeight, STUB);
eq("a tiny fraction is floored the same way", barStyle(0.001).minHeight, STUB);`);

sub(`let monotonic = true;
let previous = -1;
for (let hi = 20; hi <= 60; hi += 0.5) {
  const height = barHeight(hazardFraction(hi, HEAT_BASE, HEAT_CEILING), 112, 2);
  if (height < previous) monotonic = false;
  previous = height;
}`,
`let monotonic = true;
let previous = -1;
for (let hi = 20; hi <= 60; hi += 0.5) {
  const height = parseFloat(barStyle(hazardFraction(hi, HEAT_BASE, HEAT_CEILING)).height);
  if (height < previous) monotonic = false;
  previous = height;
}`);

fs.writeFileSync(p, s);
console.log("chart test updated");
