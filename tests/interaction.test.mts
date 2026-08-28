/**
 * Checks for the interaction logic behind the scrubbable timeline.
 *
 * These exist because the browser is where this code is wrong in ways that are
 * hard to see. A scrub that is one column out looks completely correct and
 * reports the wrong hour, and a projection flag that fails to set would present
 * a forecast with the authority of a measurement.
 */

import { indexFromRatio, indexFromClientX } from "../lib/scrub";
import { viewAt, findEscalation } from "../lib/projection";
import type { Snapshot, HourlyPoint } from "../lib/open-meteo";
import { heatIndexC, classifyHeat } from "../lib/heat-index";
import { classifyRain } from "../lib/rainfall";

let fails = 0;

function eq(label: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}: got ${got}, want ${want}`);
}

console.log("\nScrub position mapping");
eq("left edge maps to hour 0", indexFromRatio(0, 24), 0);
eq("just inside the first column", indexFromRatio(0.041, 24), 0);
eq("start of the second column", indexFromRatio(1 / 24, 24), 1);
eq("midpoint lands on hour 12", indexFromRatio(0.5, 24), 12);
eq("just short of the right edge", indexFromRatio(0.9999, 24), 23);
eq("exact right edge clamps in range", indexFromRatio(1, 24), 23);
eq("overshoot right clamps", indexFromRatio(1.8, 24), 23);
eq("overshoot left clamps", indexFromRatio(-0.4, 24), 0);
eq("degenerate count is safe", indexFromRatio(0.5, 0), 0);

// Every column must be reachable, and no column may be reachable twice from
// its own midpoint. This is the property that catches an off-by-one.
const width = 960;
const reached = new Set<number>();
for (let i = 0; i < 24; i++) {
  const midpoint = ((i + 0.5) / 24) * width;
  reached.add(indexFromClientX(midpoint, { left: 0, width }, 24));
}
eq("every column reachable from its own midpoint", reached.size, 24);
eq(
  "column midpoints map to their own index",
  indexFromClientX((7.5 / 24) * width, { left: 0, width }, 24),
  7,
);
eq(
  "track offset is accounted for",
  indexFromClientX(200 + (7.5 / 24) * width, { left: 200, width }, 24),
  7,
);
eq("zero width track is safe", indexFromClientX(50, { left: 0, width: 0 }, 24), 0);

console.log("\nProjection flagging");

function hour(time: string, t: number, rh: number, mm: number): HourlyPoint {
  return { time, temperatureC: t, humidity: rh, precipitation: mm, heatIndexC: heatIndexC(t, rh) };
}

const hourly: HourlyPoint[] = [
  hour("2026-08-26T14:00", 31, 70, 0),
  hour("2026-08-26T15:00", 33, 72, 0),
  hour("2026-08-26T16:00", 36, 75, 2),
  hour("2026-08-26T17:00", 30, 88, 22),
];

const snapshot = {
  place: { name: "Test", admin: "Test", latitude: 0, longitude: 0 },
  observedAt: "2026-08-26T14:00",
  temperatureC: 31,
  humidity: 70,
  windKph: 5,
  precipitation: 0,
  threeHourAccumulation: 0,
  slowFloodRisk: false,
  heatIndexC: heatIndexC(31, 70),
  heat: classifyHeat(heatIndexC(31, 70)),
  rain: classifyRain(0),
  hourly,
} as Snapshot;

eq("the live reading is never marked projected", viewAt(snapshot, null).isProjected, false);
eq("hour zero is the current hour, not a projection", viewAt(snapshot, 0).isProjected, false);
eq("any later hour is marked projected", viewAt(snapshot, 2).isProjected, true);
eq("out of range index clamps to the last hour", viewAt(snapshot, 99).time, "2026-08-26T17:00");
eq("scrubbed view reports that hour's own readings", viewAt(snapshot, 3).precipitation, 22);
eq("scrubbed view reclassifies rather than reusing now", viewAt(snapshot, 3).rain.label, "Orange");
eq("rain outranks heat in the scrubbed view", viewAt(snapshot, 3).rainLeads, true);

console.log("\nEscalation detection");
const escalation = findEscalation(snapshot);
eq("an escalation is found", escalation !== null, true);
// Now is Extreme Caution at 37.6C apparent. By 15:00, 33C air at 72% humidity
// reads 44.3C apparent, which is already Danger, so that is the first
// worsening hour even though hotter air and heavy rain arrive later.
eq("earliest worsening hour is reported", escalation?.time, "2026-08-26T15:00");
eq("escalation index points at that hour", escalation?.index, 1);
eq("escalation names the hazard that drove it", escalation?.kind, "heat");
eq("escalation carries the band it reaches", escalation?.label, "Danger");

const calmHourly = [hour("2026-08-26T14:00", 24, 50, 0), hour("2026-08-26T15:00", 23, 50, 0)];
const calmSnapshot = { ...snapshot, hourly: calmHourly } as Snapshot;
eq("no escalation when nothing worsens", findEscalation(calmSnapshot), null);

console.log(fails === 0 ? "\nAll checks passed.\n" : `\n${fails} check(s) failed.\n`);
process.exit(fails === 0 ? 0 : 1);
