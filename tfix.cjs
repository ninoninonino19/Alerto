const fs = require("fs");
const p = "tests/advice.test.mts";
let s = fs.readFileSync(p, "utf8");
function sub(a, b) {
  if (!s.includes(a)) { console.error("MISS: " + a.slice(0, 60).replace(/\n/g, " ")); process.exitCode = 1; return; }
  s = s.split(a).join(b);
}

sub(`import { buildPrompt } from "../lib/advice/prompt";
import { MAX_DETAIL, MAX_ITEMS, MAX_TITLE, type ModelItem } from "../lib/advice/types";`,
`import { buildPrompt } from "../lib/advice/prompt";
import type { AdviceContext } from "../lib/advice/context";
import {
  MAX_AUDIENCE,
  MAX_DETAIL,
  MAX_ITEMS,
  MAX_TITLE,
  type ModelItem,
} from "../lib/advice/types";`);

sub(`const good: ModelItem = {
  title: "Stop outdoor work",
  detail: "The apparent temperature is high enough for heat exhaustion within an hour.",
  urgency: "act-now",
  icon: "work",
};`,
`const good: ModelItem = {
  title: "Stop outdoor work",
  detail: "The apparent temperature is high enough for heat exhaustion within an hour.",
  audience: "Outdoor workers",
  urgency: "act-now",
  icon: "work",
};

const AFTERNOON: AdviceContext = { partOfDay: "afternoon", worsening: null };
const WORSENING: AdviceContext = { partOfDay: "morning", worsening: "heat" };`);

sub(`const danger = buildPrompt(
  band("danger"),
  rain("none"),
  buildAdvisories(band("danger"), rain("none")),
);`,
`const danger = buildPrompt(
  band("danger"),
  rain("none"),
  buildAdvisories(band("danger"), rain("none")),
  AFTERNOON,
);`);

sub(`const calm = buildPrompt(band("safe"), rain("none"), buildAdvisories(band("safe"), rain("none")));`,
`const calm = buildPrompt(
  band("safe"),
  rain("none"),
  buildAdvisories(band("safe"), rain("none")),
  AFTERNOON,
);`);

sub(`eq("it bans em dashes", danger.includes("Do not use em dashes"), true);`,
`eq("it bans em dashes", danger.includes("Do not use em dashes"), true);
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
eq("it asks for an audience", worse.includes("who this matters most for"), true);`);

sub(`console.log("\nOutput cannot break the layout");`,
`console.log("\nAudience is optional, never fatal");
eq("audience survives", sanitise([good])[0].audience, "Outdoor workers");
eq(
  "a missing audience keeps the item",
  sanitise([{ ...good, audience: undefined as never }]).length,
  1,
);
eq(
  "and leaves the field unset",
  sanitise([{ ...good, audience: "  " }])[0].audience,
  undefined,
);
eq(
  "a long audience is clamped",
  sanitise([{ ...good, audience: "A".repeat(200) }])[0].audience!.length,
  MAX_AUDIENCE,
);

console.log("\nOutput cannot break the layout");`);

fs.writeFileSync(p, s);
console.log("ok");
