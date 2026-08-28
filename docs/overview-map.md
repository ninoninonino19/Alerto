# Overview map — unbuilt specification

**Status: not implemented.** Nothing described below exists in the codebase.
There is no `lib/ph-outline.ts`, no map component, and no reference to any of it
outside this file.

It was written as a README section, in the present tense, for a feature that was
either cut or never started. It is kept because the reasoning is worth having if
the map is ever built: the one-request API budget and the decision to pin every
locality at Extreme Caution and above are the parts that would otherwise have to
be rediscovered.

---

## The map, and the API budget

The overview panel tracks twenty localities across all three island groups, and
the whole thing costs **one upstream request**.

Open-Meteo accepts comma-separated coordinate lists and answers with an array in
the same order, so twenty readings are one call rather than twenty. That call is
cached for ten minutes and shared by every visitor, which works out to roughly
144 requests a day for the map no matter how much traffic arrives. Request count
does not scale with visitors, which is the property that keeps a free tier
intact. A map that resolved arbitrary places on demand would not have it.

**Only localities at Extreme Caution or above are pinned.** The brief asked for
Extreme Caution, but filtering to that single band would have hidden Danger and
Extreme Danger. A map that omits the worst places is worse than no map, so the
threshold is that level and above. When nothing qualifies, the panel says so
rather than showing an empty country.

**The map is pannable, zoomable, and tappable.** Drag to pan, scroll or use the
buttons to zoom, and tap anywhere to read that exact coordinate. That last one
matters more than it looks: it is the only way to reach a barangay the geocoder
has never heard of, which is the same gap that makes "Sampaloc, Manila"
unanswerable. Pins hold their apparent size as the map scales, so zooming in
does not turn them into blobs.

Pan and zoom are one `transform` on a single group, so a gesture costs a
composite rather than a layout pass. Discrete zooms from the buttons ease over
220ms; a drag or a wheel does not ease at all, because smoothing a value the
pointer already controls reads as lag.

The coastline is Natural Earth 1:50m public-domain boundary data, projected once
at build time and vendored into `lib/ph-outline.ts` as a static path. No tile
server, no map SDK, no API key, nothing fetched at runtime. The projection and
its inverse live in that same file, so a tap turns back into a real coordinate
with exactly the maths that drew the coast, and `npm test` checks that the round
trip is lossless.
