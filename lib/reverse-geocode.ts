import type { Place } from "./open-meteo";

/**
 * Turns coordinates into a place name, in the browser.
 *
 * Open-Meteo geocodes by name only, so naming a point needs a different
 * service. This one is BigDataCloud's client-side endpoint: no key, no server
 * involvement, and no draw on the forecast budget, because the request goes
 * from the reader's browser rather than from ours.
 *
 * It is also the only place in this project where a coordinate leaves for a
 * third party, which is why the caller rounds first. What gets sent is already
 * blunt to about a kilometre.
 */
const ENDPOINT = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const TIMEOUT_MS = 6000;

type Response = {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  countryCode?: string;
};

/** Open-Meteo and this service both prefix names; the prefix is noise here. */
function tidy(value?: string): string {
  return (value ?? "")
    .replace(/^(City of|Municipality of|Province of)\s+/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();
}

/**
 * The best available name for a point, or null if the lookup fails.
 *
 * Null is a normal outcome, not an error worth reporting. The caller has
 * coordinates, which are enough to fetch a reading; a name only makes that
 * reading easier to recognise.
 */
export async function describeCoordinates(
  latitude: number,
  longitude: number,
): Promise<Place | null> {
  const url = `${ENDPOINT}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;

    const data = (await response.json()) as Response;

    /*
     * locality before city. In Metro Manila the city field returns "Manila" for
     * the whole conurbation, so somebody in Marikina would be told they are in
     * Manila; locality gives the actual city they are standing in.
     */
    const name = tidy(data.locality) || tidy(data.city);
    if (!name) return null;

    const admin = tidy(data.principalSubdivision);
    return {
      name,
      admin: admin || "Philippines",
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}
