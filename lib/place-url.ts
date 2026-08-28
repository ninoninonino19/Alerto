import type { Place } from "./open-meteo";

/**
 * A place is carried in the URL so a reading can be linked and shared, which
 * matters when somebody wants to send a neighbour the state of their barangay.
 * Building the query in one place keeps the map, the search, and any future
 * entry point from drifting apart.
 */
export function placeHref(place: Place): string {
  const params = new URLSearchParams({
    place: place.name,
    admin: place.admin,
    lat: place.latitude.toFixed(4),
    lon: place.longitude.toFixed(4),
  });
  return `/?${params.toString()}`;
}
