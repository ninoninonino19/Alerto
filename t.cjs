const fs = require("fs");
const p = "tests/advice.test.mts";
let s = fs.readFileSync(p, "utf8");
function sub(a, b) {
  if (!s.includes(a)) { console.error("MISS: " + a.slice(0, 60).replace(/\n/g, " ")); process.exitCode = 1; return; }
  s = s.split(a).join(b);
}

sub(`import {
  MAX_AUDIENCE,
  MAX_DETAIL,
  MAX_ITEMS,
  MAX_TITLE,
  type ModelItem,
} from "../lib/advice/types";`,
`import { MAX_DETAIL, MAX_ITEMS, MAX_TITLE, type ModelItem } from "../lib/advice/types";`);

sub(`const good: ModelItem = {
  title: "Stop outdoor work",
  detail: "The apparent temperature is high enough for heat exhaustion within an hour.",
  audience: "Outdoor workers",
  urgency: "act-now",
  icon: "work",
};`,
`const good: ModelItem = {
  title: "Stop outdoor work",
  detail: "The apparent temperature is high enough for heat exhaustion within an hour.",
  urgency: "act-now",
  icon: "work",
};`);

sub(`eq("an unknown icon is dropped", sanitise([{ ...good, icon: "siren" as never }]).length, 0);`,
`// The cards no longer show icons, so an unknown one is no longer a reason to
// discard sound advice. Urgency still is: it decides ordering and prominence.
eq("an unknown icon keeps the item", sanitise([{ ...good, icon: "siren" as never }]).length, 1);
eq("and falls back to a valid one", sanitise([{ ...good, icon: "siren" as never }])[0].icon, "health");`);

sub(`// An unknown icon is dropped rather than defaulted. Guessing would put a
// rainfall icon on a heat instruction and quietly mislead.
eq(
  "one bad item does not discard the good ones",
  sanitise([{ ...good, icon: "siren" as never }, good]).length,
  1,
);

console.log("\nAudience is optional, never fatal");
eq("audience survives", sanitise([good])[0].audience, "Outdoor workers");
eq(
  "a missing audience keeps the item",
  sanitise([{ ...good, audience: undefined as never }]).length,
  1,
);
eq("a blank audience leaves the field unset", sanitise([{ ...good, audience: "  " }])[0].audience, undefined);
eq(
  "a long audience is clamped",
  sanitise([{ ...good, audience: "A".repeat(200) }])[0].audience!.length,
  MAX_AUDIENCE,
);
`,
`eq(
  "one bad item does not discard the good ones",
  sanitise([{ ...good, urgency: "urgent" as never }, good]).length,
  1,
);
`);

sub(`eq("it asks for an audience", worse.includes("who this matters most for"), true);`,
`eq("it no longer asks for a separate audience field", worse.includes("- audience:"), false);`);

fs.writeFileSync(p, s);
console.log("ok");
