import type { Place } from "./open-meteo";

/**
 * Philippine place lookup.
 *
 * The naive version sent the whole query string to Open-Meteo, which matches on
 * a single place name and returns nothing at all for "Sampaloc, Manila". That
 * is the shape people actually type, so the comma is parsed here: the part
 * before it is the place, the part after it is a qualifier used to rank the
 * results.
 */

type GeocodeResult = {
  name: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  latitude: number;
  longitude: number;
  population?: number;
};

type GeocodeResponse = { results?: GeocodeResult[] };

/** Results shown in the dropdown, and how many of those are held for fallbacks. */
const TOTAL_CAP = 7;
const FALLBACK_CAP = 2;

export type PlaceMatch = {
  place: Place;
  /** Region, shown dimmed as a second line so near-identical names separate. */
  context: string;
  /**
   * True when the qualifier matched nothing and this is the qualifier itself
   * resolved as a place. Searching a barangay that Open-Meteo does not carry
   * should still get you to the right city.
   */
  broader: boolean;
};

/** Open-Meteo prefixes provinces and municipalities; the prefix is noise here. */
function tidy(value?: string): string {
  return (value ?? "").replace(/^(Province of|Municipality of|City of)\s+/i, "").trim();
}

/**
 * Decomposing to NFD splits accented letters into a base plus a combining mark,
 * and the following class drops everything that is not a plain letter, digit,
 * or space. That folds "Niño" and "Nino" together without needing a
 * separate diacritic range.
 */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * admin2 is the province and admin3 the municipality. For a barangay-level
 * name like Sampaloc the municipality is what tells the nineteen of them apart,
 * so both are kept.
 */
function areaLabel(result: GeocodeResult): string {
  const self = fold(result.name);
  const parts = [tidy(result.admin3), tidy(result.admin2)]
    .filter(Boolean)
    // A municipality often carries the same name as its town centre, which
    // would render as "Lucban, Lucban, Quezon".
    .filter((part) => fold(part) !== self);
  const unique = parts.filter((part, i) => parts.indexOf(part) === i);
  return unique.join(", ") || tidy(result.admin1) || "Philippines";
}

/** How well a result answers the part of the query after the comma. */
function scoreQualifier(result: GeocodeResult, qualifier: string): number {
  if (!qualifier) return 0;
  const needle = fold(qualifier);
  if (!needle) return 0;

  const fields: Array<[string | undefined, number]> = [
    [result.admin3, 3],
    [result.admin2, 2],
    [result.admin1, 1],
  ];

  let best = 0;
  for (const [raw, weight] of fields) {
    const hay = fold(tidy(raw));
    if (!hay) continue;
    if (hay === needle) best = Math.max(best, weight * 2);
    else if (hay.includes(needle) || needle.includes(hay)) best = Math.max(best, weight);
  }
  return best;
}

async function geocode(name: string, count: number): Promise<GeocodeResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "en");
  url.searchParams.set("countryCode", "PH");

  // Place names do not move. A day of caching keeps repeat lookups off the API.
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return [];
  const data = (await response.json()) as GeocodeResponse;
  return data.results ?? [];
}

function placeIdentity(place: Place): string {
  return `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
}

function toMatch(result: GeocodeResult, broader: boolean): PlaceMatch {
  return {
    place: {
      name: result.name,
      admin: areaLabel(result),
      latitude: result.latitude,
      longitude: result.longitude,
    },
    context: tidy(result.admin1),
    broader,
  };
}

export async function searchPlaces(query: string): Promise<PlaceMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [head, ...rest] = trimmed.split(",");
  const primary = head.trim();
  const qualifier = rest.join(",").trim();
  if (primary.length < 2) return [];

  // A wider net than we display, because the qualifier does the narrowing.
  const results = await geocode(primary, qualifier ? 20 : 8);

  const ranked = results
    .map((result) => ({ result, score: scoreQualifier(result, qualifier) }))
    .sort((a, b) => b.score - a.score || (b.result.population ?? 0) - (a.result.population ?? 0));

  const qualifierMatched = ranked.some((entry) => entry.score > 0);

  /*
   * Open-Meteo's dataset stops above barangay level across most of the country,
   * so "Sampaloc, Manila" has no exact answer: all nineteen Sampalocs it knows
   * are outside Metro Manila. Resolving the qualifier on its own puts Manila in
   * the list. For a hazard readout that is the honest answer anyway, because the
   * forecast grid is kilometres wide and a barangay shares its city's cell.
   *
   * Room is reserved for those broader matches before the primary list is
   * trimmed. Appending them to a full list and trimming afterwards would drop
   * the one result the person was actually looking for.
   */
  const wantsFallback = Boolean(qualifier) && !qualifierMatched;
  const primaryCap = wantsFallback ? TOTAL_CAP - FALLBACK_CAP : TOTAL_CAP;
  const matches = ranked.slice(0, primaryCap).map(({ result }) => toMatch(result, false));

  if (wantsFallback) {
    const fallback = await geocode(qualifier, FALLBACK_CAP);
    const seen = new Set(matches.map((match) => placeIdentity(match.place)));
    for (const result of fallback) {
      const identity = `${result.latitude.toFixed(4)},${result.longitude.toFixed(4)}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      matches.push(toMatch(result, true));
    }
  }

  return matches.slice(0, TOTAL_CAP);
}
