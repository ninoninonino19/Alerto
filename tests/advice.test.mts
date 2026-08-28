/**
 * Checks for the advice layer.
 *
 * A model writing public safety text is untrusted input. The schema Gemini
 * enforces constrains shape and says nothing about content, so everything on
 * the way out is validated here, and every failure path has to land on the
 * fixed PAGASA rules rather than on an empty panel.
 */

import { sanitiseForTests as sanitise } from "../lib/advice";
import { buildPrompt } from "../lib/advice/prompt";
import type { AdviceContext } from "../lib/advice/context";
import { MAX_DETAIL, MAX_ITEMS, MAX_TITLE, type ModelItem } from "../lib/advice/types";
import { HEAT_BANDS } from "../lib/heat-index";
import { RAIN_BANDS } from "../lib/rainfall";
import { buildAdvisories } from "../lib/advisories";

let fails = 0;

function eq(label: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(
    `${ok ? "pass" : "FAIL"}  ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
  );
}

const band = (level: string) => HEAT_BANDS.find((b) => b.level === level)!;
const rain = (level: string) => RAIN_BANDS.find((b) => b.level === level)!;

const good: ModelItem = {
  title: "Stop outdoor work",
  detail: "The apparent temperature is high enough for heat exhaustion within an hour.",
  urgency: "act-now",
  icon: "work",
};

const AFTERNOON: AdviceContext = { partOfDay: "afternoon", worsening: null };
const WORSENING: AdviceContext = { partOfDay: "morning", worsening: "heat" };

console.log("\nModel output is validated, not trusted");
eq("a well formed item survives", sanitise([good]).length, 1);
eq("an unknown urgency is dropped", sanitise([{ ...good, urgency: "urgent" as never }]).length, 0);
// The cards no longer show icons, so an unknown one is no longer a reason to
// discard sound advice. Urgency still is: it decides ordering and prominence.
eq("an unknown icon keeps the item", sanitise([{ ...good, icon: "siren" as never }]).length, 1);
eq(
  "and falls back to a valid one",
  sanitise([{ ...good, icon: "siren" as never }])[0].icon,
  "health",
);
eq("an empty title is dropped", sanitise([{ ...good, title: "   " }]).length, 0);
eq("an empty detail is dropped", sanitise([{ ...good, detail: "" }]).length, 0);
eq("a missing field is dropped", sanitise([{ title: "x" } as ModelItem]).length, 0);
eq("a null item is dropped", sanitise([null as unknown as ModelItem]).length, 0);
eq("a non-string title is dropped", sanitise([{ ...good, title: 42 as never }]).length, 0);

// Urgency is still fatal, because it decides ordering and how prominent an
// instruction is. One malformed item must not take a sound one down with it.
eq(
  "one bad item does not discard the good ones",
  sanitise([{ ...good, urgency: "urgent" as never }, good]).length,
  1,
);

console.log("\nOutput cannot break the layout");
const long = sanitise([{ ...good, title: "T".repeat(400), detail: "D".repeat(2000) }])[0];
eq("titles are clamped", long.title.length, MAX_TITLE);
eq("details are clamped", long.detail.length, MAX_DETAIL);
eq("the list is capped", sanitise(Array.from({ length: 40 }, () => good)).length, MAX_ITEMS);
eq(
  "titles are trimmed",
  sanitise([{ ...good, title: "  Move indoors  " }])[0].title,
  "Move indoors",
);

console.log("\nMost urgent first");
const mixed = sanitise([
  { ...good, title: "Later", urgency: "advice" },
  { ...good, title: "Soon", urgency: "prepare" },
  { ...good, title: "Now", urgency: "act-now" },
]);
eq("act-now leads", mixed[0].title, "Now");
eq("prepare follows", mixed[1].title, "Soon");
eq("advice last", mixed[2].title, "Later");

console.log("\nThe prompt cannot invent a hazard");
const danger = buildPrompt(
  band("danger"),
  rain("none"),
  buildAdvisories(band("danger"), rain("none")),
  AFTERNOON,
);
eq("it states the classified heat level", danger.includes("Danger"), true);
eq("it states the classified rain level", danger.includes("No warning"), true);
// Asserted on the section heading plus the clause, so rewording the prose
// does not quietly drop a safety constraint without a test noticing.
const banned = danger.slice(danger.indexOf("WHAT YOU MAY NOT ADD"));
eq("there is a list of things it may not add", banned.length > 0, true);
eq("it forbids inventing actions", banned.includes("A new kind of action"), true);
eq(
  "it forbids unprompted evacuation",
  banned.includes("Evacuation, unless an approved action"),
  true,
);
eq(
  "it forbids other hazard levels",
  banned.includes("hazard level other than the two stated"),
  true,
);
eq("it carries the approved rules", danger.includes("Stop non-essential outdoor work"), true);
eq("it bans em dashes", danger.includes("Do not use em dashes"), true);
eq("it bans invented figures", danger.includes("Invented numbers"), true);
eq("it bans naming hotlines", danger.includes("Named agencies, hotlines"), true);

// The loosened boundary: elaboration is invited, new kinds of action are not.
eq("it invites practical detail", danger.includes("WHAT YOU MAY ADD"), true);
eq("it still bars new actions", danger.includes("A new kind of action"), true);

console.log("\nThe prompt carries the situation");
eq("it states the part of day", danger.includes("currently afternoon"), true);
eq("a steady forecast says so", danger.includes("Neither hazard is forecast to worsen"), true);
const worse = buildPrompt(
  band("caution"),
  rain("none"),
  buildAdvisories(band("caution"), rain("none")),
  WORSENING,
);
eq("a worsening forecast says so", worse.includes("forecast to reach a worse level"), true);
eq("and carries its own part of day", worse.includes("currently morning"), true);
eq("it no longer asks for a separate audience field", worse.includes("- audience:"), false);

// A calm situation must not be talked into having advice.
const calm = buildPrompt(
  band("safe"),
  rain("none"),
  buildAdvisories(band("safe"), rain("none")),
  AFTERNOON,
);
eq("a calm baseline says so", calm.includes("No advisory is in effect"), true);
eq("and asks for an empty list", calm.includes("return an empty list"), true);
eq("an empty baseline validates as empty", sanitise([]).length, 0);

console.log("\nEvery situation has a deterministic answer");
// This is what the fallback relies on: the fixed rules cover all twenty
// combinations, so no failure of the model can leave the panel with nothing.
let covered = 0;
for (const heat of HEAT_BANDS) {
  for (const wet of RAIN_BANDS) {
    const rules = buildAdvisories(heat, wet);
    const hazardous = heat.level !== "safe" || wet.level !== "none";
    if (hazardous && rules.length === 0) {
      console.log(`FAIL  ${heat.level}/${wet.level} has no fallback advice`);
      fails++;
    }
    covered++;
  }
}
eq("all band pairs checked", covered, HEAT_BANDS.length * RAIN_BANDS.length);

console.log(fails === 0 ? "\nAll checks passed.\n" : `\n${fails} check(s) failed.\n`);
process.exit(fails === 0 ? 0 : 1);
