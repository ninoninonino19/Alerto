/**
 * Checks for place search.
 *
 * The upstream geocoder is stubbed so these run offline and deterministically.
 * The fixtures are real responses: nineteen Sampalocs, none of them in Metro
 * Manila, which is the case that broke the naive implementation.
 */

import { searchPlaces } from "../lib/geocode";

let fails = 0;

function eq(label: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(
    `${ok ? "pass" : "FAIL"}  ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
  );
}

type Row = {
  name: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  latitude: number;
  longitude: number;
  population?: number;
};

const SAMPALOC: Row[] = [
  {
    name: "Sampaloc",
    admin1: "Calabarzon",
    admin2: "Province of Rizal",
    admin3: "Tanay",
    latitude: 14.5402,
    longitude: 121.3602,
    population: 20157,
  },
  {
    name: "Sampaloc",
    admin1: "Calabarzon",
    admin2: "Quezon",
    admin3: "Sampaloc Municipality",
    latitude: 14.1627,
    longitude: 121.6396,
    population: 6743,
  },
  {
    name: "Sampaloc",
    admin1: "Calabarzon",
    admin2: "Province of Batangas",
    admin3: "Municipality of Talisay",
    latitude: 14.0877,
    longitude: 120.971,
    population: 3023,
  },
  {
    name: "Sampaloc",
    admin1: "Central Luzon",
    admin2: "Province of Nueva Ecija",
    admin3: "Municipality of Lupao",
    latitude: 15.8167,
    longitude: 120.8667,
    population: 2206,
  },
  {
    name: "Sampaloc",
    admin1: "Calabarzon",
    admin2: "Province of Laguna",
    admin3: "Municipality of Pagsanjan",
    latitude: 14.2701,
    longitude: 121.4434,
  },
  {
    name: "Sampaloc",
    admin1: "Central Luzon",
    admin2: "Province of Bulacan",
    admin3: "Municipality of San Rafael",
    latitude: 14.9803,
    longitude: 120.9245,
  },
  {
    name: "Sampaloc",
    admin1: "Central Luzon",
    admin2: "Province of Nueva Ecija",
    admin3: "Pantabangan",
    latitude: 15.8,
    longitude: 121.15,
  },
  {
    name: "Sampaloc",
    admin1: "Calabarzon",
    admin2: "Province of Cavite",
    admin3: "City of Dasmariñas",
    latitude: 14.33,
    longitude: 120.94,
  },
];

const MANILA: Row[] = [
  {
    name: "Manila",
    admin1: "National Capital Region",
    admin2: "Capital District",
    admin3: "Santa Cruz",
    latitude: 14.6042,
    longitude: 120.9822,
    population: 1600000,
  },
  {
    name: "Manila",
    admin1: "Mimaropa",
    admin2: "Oriental Mindoro",
    admin3: "Municipality of Bulalacao",
    latitude: 12.5,
    longitude: 121.4,
  },
];

const LUCBAN: Row[] = [
  {
    name: "Lucban",
    admin1: "Cagayan Valley",
    admin2: "Province of Cagayan",
    admin3: "Abulug",
    latitude: 18.3364,
    longitude: 121.4308,
    population: 5000,
  },
  {
    name: "Lucban",
    admin1: "Calabarzon",
    admin2: "Quezon",
    admin3: "Lucban",
    latitude: 14.1136,
    longitude: 121.5556,
    population: 4000,
  },
  {
    name: "Lucban",
    admin1: "Cagayan Valley",
    admin2: "Province of Quirino",
    admin3: "Diffun",
    latitude: 16.6028,
    longitude: 121.4828,
  },
];

const calls: string[] = [];

function stub(rows: Record<string, Row[]>) {
  calls.length = 0;
  globalThis.fetch = (async (input: string | URL) => {
    const url = new URL(String(input));
    const name = url.searchParams.get("name") ?? "";
    const count = Number(url.searchParams.get("count") ?? "0");
    calls.push(name);
    const results = (rows[name.toLowerCase()] ?? []).slice(0, count);
    return { ok: true, json: async () => ({ results }) } as Response;
  }) as typeof fetch;
}

const label = (m: { place: { name: string; admin: string } }) =>
  `${m.place.name}, ${m.place.admin}`;

console.log("\nCompound queries");
stub({ sampaloc: SAMPALOC, manila: MANILA });
const compound = await searchPlaces("Sampaloc, Manila");
// The naive implementation sent the whole string upstream and got nothing back.
eq("a comma no longer returns zero results", compound.length > 0, true);
eq("the place before the comma is what gets looked up", calls[0], "Sampaloc");
eq("the qualifier is looked up too when nothing matched it", calls[1], "Manila");

const broader = compound.filter((m) => m.broader);
eq("a broader match is offered", broader.length > 0, true);
eq("and it is the real Metro Manila", label(broader[0]), "Manila, Santa Cruz, Capital District");
eq("primary matches still come first", compound[0].broader, false);
eq("the list stays within its cap", compound.length <= 7, true);

console.log("\nQualifier ranking");
stub({ lucban: LUCBAN });
const lucban = await searchPlaces("Lucban, Quezon");
eq("the qualified province wins", label(lucban[0]), "Lucban, Quezon");
eq("no fallback lookup when the qualifier matched", calls.length, 1);
eq(
  "nothing is flagged as broader",
  lucban.some((m) => m.broader),
  false,
);

console.log("\nPlain queries");
stub({ sampaloc: SAMPALOC });
const plain = await searchPlaces("Sampaloc");
eq("a bare name needs one request only", calls.length, 1);
eq("results are labelled by municipality and province", label(plain[0]), "Sampaloc, Tanay, Rizal");
eq(
  "no broader matches without a qualifier",
  plain.some((m) => m.broader),
  false,
);

console.log("\nGuards");
stub({});
eq("a single character is not looked up", (await searchPlaces("S")).length, 0);
eq("no request was made", calls.length, 0);
eq("a lone comma is not looked up", (await searchPlaces(", Manila")).length, 0);

stub({ sampaloc: SAMPALOC, manila: MANILA });
const spaced = await searchPlaces("  sampaloc ,  MANILA  ");
eq(
  "whitespace and case are tolerated",
  spaced.some((m) => m.broader),
  true,
);

console.log(fails === 0 ? "\nAll checks passed.\n" : `\n${fails} check(s) failed.\n`);
process.exit(fails === 0 ? 0 : 1);
