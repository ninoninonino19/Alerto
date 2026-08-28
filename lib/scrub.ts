/**
 * Maps a pointer position along the timeline to an hour index.
 *
 * Extracted from the component because an off-by-one here is invisible in
 * review and wrong in use: it would report the 14:00 reading while the
 * playhead sits over the 15:00 column. The interface would look correct and
 * tell somebody the wrong thing about their afternoon.
 */
export function indexFromRatio(ratio: number, count: number): number {
  if (count <= 0) return 0;
  const raw = Math.floor(ratio * count);
  return Math.min(count - 1, Math.max(0, raw));
}

/** Pointer clientX against the track's own box, clamped to the track. */
export function indexFromClientX(
  clientX: number,
  rect: { left: number; width: number },
  count: number,
): number {
  if (rect.width === 0) return 0;
  return indexFromRatio((clientX - rect.left) / rect.width, count);
}
