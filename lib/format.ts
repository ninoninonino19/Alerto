/**
 * Open-Meteo is asked for Asia/Manila, so its timestamps arrive as local wall
 * time with no offset. Parsing them with `new Date` would reinterpret them in
 * whatever zone the server or the browser happens to be in, which both shifts
 * the clock and risks a hydration mismatch. Reading the characters is exact.
 */
export function hourLabel(iso: string): string {
  return iso.slice(11, 16);
}

export function hourNumber(iso: string): number {
  return Number(iso.slice(11, 13));
}
