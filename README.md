# Alerto

Live heat index and rainfall advisories for Philippine localities, classified
against PAGASA thresholds. Opens on Manila, or on your own location if you
allow it.

```bash
npm run dev
```

```bash
npm test
```

## What the dashboard is built around

The question a hazard dashboard exists to answer is "am I in danger right now,
and what do I do about it", not "what is the temperature". Every layout decision
follows from putting those two answers first.

**Verdict, evidence, inputs.** The page reads top to bottom in that order. The
advisory level is the largest thing on the screen, set in the display face at
hero scale, and the raw meteorological readings are the smallest, in the last
card. A conventional weather layout inverts this and leads with a large
temperature number, which is the least actionable value on the page.

**The levels are the chart's axis.** A rail down the left side draws the PAGASA
bands at their real positions on the scale, with a marker at each live reading,
so a band's height on the rail is exactly the height a bar has to reach to be in
that band. The question "how far am I from Danger" is answered by looking
across. Dashed guides carry the same thresholds over the bars themselves.

The rail is generated from the same band tables the classifier uses, so it
cannot disagree with the level named at the top of the page, and `npm test`
checks that every marker position lands in the band the classifier would name.

**One chart, not two.** A hot morning that breaks into a downpour by
mid-afternoon is a different day to plan for than either half suggests alone,
and separate charts hide the interaction.

## Interaction

The timeline is the control, not a picture. Hovering it previews an hour;
**pressing pins that hour** so the readings above stay put without the pointer
having to stay still, and they hold until Back to live releases them. Arrow keys
pin as well, since pressing a key is as deliberate as a click, and Escape
releases.

The hour being read is named by a chip riding the playhead, and the fixed axis
ticks step back while it is showing. The ticks are too small and too far from
the pointer to answer "which hour is this", which is the only question a scrub
asks. The chip turns from ink to the brand lime once the hour is pinned, so the
difference between previewing and holding is visible without reading a button.

**One chart, one centre line.** Heat is measured up from the Caution threshold
and rain down from nothing, so in both directions the distance from the middle
is the size of the hazard rather than the size of the raw number. A short bar is
safe whichever way it points, which is what lets two different hazards, in two
different units, share one axis honestly. `npm test` checks that worse
conditions can never draw a shorter bar.

**Both scales are fixed, not fitted to the day.** An axis that refits itself to
the current peak makes the same bar height mean a different danger on Tuesday
than it did on Monday, and makes one locality incomparable with another. Fixed
ends also keep the level rail still instead of sliding it around under the
reader.

**But the floor is 20 degrees, not the 27 where hazard begins.** Starting the
axis at the hazard threshold sounded principled and drew an empty chart: on an
ordinary Philippine day every reading sat within a few percent of the bottom and
the graph read as blank. Twenty degrees is still unambiguously safe, so the
centre line keeps its meaning, and a typical day now occupies a quarter of the
track instead of a twentieth.

**Rainfall uses a square root axis.** Hourly rain spends almost all its time in
the low single digits and occasionally reaches thirty, so a linear axis wide
enough to show a red warning renders ordinary rain as nothing. The square root
spreads the bottom of the range without pushing any threshold off the top: 7.5,
15 and 30 mm/h still land at 43, 61 and 87 percent.

Both of those are corrections. `npm test` now asserts that an ordinary reading
is actually drawn, because the first version of this scale was arithmetically
correct and visually blank, and no amount of checking the numbers would have
caught it.

The chart is deliberately large, and its two track heights are the only numbers
that control that. They live as CSS variables in `app/globals.css` and grow at
each breakpoint; everything drawn into them works in fractions of the track, so
resizing the graph is a two-line edit and no geometry is recomputed. The extra
height also softens the cost of the fixed scale, since a quiet day's short bars
are drawn on a taller track.

**Each reading appears exactly once.** The heat index and rainfall used to be
stated at the top and again in a pair of panels below the chart. Those panels
are gone, and the sentences that made them worth reading, the humidity behind
the heat index and the three hour total behind the hourly rainfall, now sit
inside the cards they explain.

**Observed and projected are never confused.** An observed reading is flat, like
every other surface in this system. A projection adds a dashed outline, and the
line under the effect reads "Forecast for" rather than "Observed". That
distinction is load-bearing rather than decorative: presenting a forecast level
with the authority of an observation is how somebody ends up caught outdoors.
It is stated twice and no more, since a third marker was only noise.

**The measured inputs do not follow the scrub.** They are the observation the
indices were computed from, so they stay anchored to now and are rendered on the
server.

**Advice is anchored to now, not to the scrub.** What somebody should do right
now must not change while they are inspecting the afternoon.

**The escalation line is also a control.** The first hour that is worse than now
is computed from the series and stated in words, and pressing it pins that hour.
The most useful fact in a 24 point series should not require reading a chart
carefully.

## Holding the layout still

Scrubbing rewrites every string in the status band, and each one is a different
length, so the band grew and shrank under the pointer and shoved the rest of the
page with it. Five separate things were moving:

- The dashed outline existed only on a projection, so the band gained four
  pixels the moment the scrub left the current hour. The border is now always
  there and merely transparent when the reading is observed.
- The level name, the effect sentence, and both reading explanations all change
  length. Each slot now renders the longest string it can ever hold, invisibly,
  in the same grid cell as the real one. The cell sizes to the reservation and
  the visible text sits on top. The reservations are derived from the same band
  tables the text comes from, so they stay correct if the wording changes, and
  no fixed height has to be guessed.
- Page height crossing the viewport made the scrollbar appear and disappear,
  jumping the whole layout sideways. `scrollbar-gutter: stable` reserves it.
- The live/back-to-now button changed width with its label, so it carries a
  minimum width.

Nothing else on the page depends on the scrub: the chart tracks, the rail, and
the measured inputs all have heights that do not vary with the reading.

## Advice generation

The "What to do" panel is written by Gemini, grounded in the PAGASA rules in
`lib/advisories.ts`.

**The model does not decide whether anything is dangerous.** That is already
settled by the thresholds before the prompt is built. What the model is asked to
do is merge two separate rule sets into one prioritised, readable list, which is
the part the fixed rules do badly: they concatenate a heat list and a rain list
and sort by urgency, so a bad day repeats the same instruction in three
wordings. The prompt carries the approved advice for the exact situation and
forbids inventing actions, implying other hazard levels, or mentioning
evacuation unless the approved advice already does.

**Everything coming back is untrusted.** Gemini enforces a response schema, but
a schema constrains shape and says nothing about content, so items with an
unknown urgency or icon are dropped rather than coerced, titles and details are
clamped, and the list is capped. Guessing at a bad icon would put a rainfall
symbol on a heat instruction and quietly mislead.

**Every failure lands on the rules.** No key, a rate limit, a timeout, unparsable
JSON, or a response where nothing survives validation all fall back to
`buildAdvisories`. `npm test` checks that all twenty heat and rainfall band
pairs resolve to advice there, because a model failure must never leave the
panel empty during a storm. The panel says which of the two produced what you
are reading.

**The cost is bounded by the design, not by traffic.** Advice depends on the two
hazard bands and nothing else: not the place, not the exact temperature. Five
heat bands and four rainfall bands make twenty possible situations, cached for a
day, so the whole feature costs at most twenty model calls however many people
load it from however many towns. Keying on the place would have tied spend to
traffic.

It renders behind a Suspense boundary as an async server component, so the
readings are never held up waiting for a model, and the skeleton is shaped like
the result so nothing jumps when it arrives.

### Adding a key

```bash
cp .env.example .env.local
```

Put a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
in `GEMINI_API_KEY` and restart the dev server. That is the API free tier, which
is separate from a Gemini Advanced or Google One AI subscription. Without a key
the dashboard works exactly as before, showing the rule-derived advice.

## Finding the reader

The dashboard opens on Manila. It is the capital, and the single place the
largest number of arrivals are either in or can recognise.

**Location is asked for with a button, not on arrival.** A permission prompt
fired on page load is the one everybody dismisses on reflex, and browsers
increasingly penalise sites that do it. So the prompt is attached to a control,
and the automatic path is reserved for readers who have already granted access:
on a return visit the reading is simply local, with nothing asked and nothing
tapped. That silent path also only runs when no place has been chosen, because
somebody who searched for Tacloban should not be dragged home by a background
lookup.

**Coordinates are rounded to two decimal places** before they are used. That is
a little over a kilometre, finer than the forecast grid it feeds and far coarser
than what a phone hands over. The value ends up in the URL, where it can be
shared, pasted, and logged, so there is no reason for it to carry a street.

A located reading is labelled "Your location" with its coordinates rather than a
place name. Open-Meteo geocodes by name only, and naming the nearest city would
attach a reading taken at one point to a town some distance away, which on a
hazard dashboard is worse than saying plainly where the numbers came from.

## Search

People type "Sampaloc, Manila". The naive implementation sent that whole string
upstream and got back nothing at all, because the geocoder matches a single
place name and the comma killed it.

The comma is now parsed: the part before it is the place, the part after it
ranks the results against the municipality, province, and region fields.
"Lucban, Quezon" now puts the Quezon one first instead of leaving seven
identically-named towns in arbitrary order.

Some queries have no exact answer. Open-Meteo's dataset stops above barangay
level across most of the country, so every Sampaloc it knows is outside Metro
Manila. When the qualifier matches nothing, it is resolved on its own and
offered under a heading that says so, which puts Manila in the list. For a
hazard readout that is the honest answer anyway: the forecast grid is kilometres
wide, so a barangay shares its city's cell and the reading would be identical.

Room for those fallbacks is reserved before the primary list is trimmed.
Appending them to a full list and cutting afterwards silently dropped the one
result the person was looking for, which is exactly what the first version did.

## Design language

Alerto wears the Wise design language: a sage canvas with white cards, a
near-black olive ink, one lime brand accent, and a heavy display sans over
Inter. Three decisions were adapted rather than copied.

**Green.** Wise reserves its lime for primary actions and warns against reusing
it as a success indicator. On a safety dashboard, though, green means all clear,
and that convention is too strong to fight. The calm state therefore uses the
brand's own badge-positive recipe, a pale-green surface with positive-deep text,
while the solid lime pill stays reserved for actions. Two different treatments,
so the two meanings never collide.

**Lime cannot be text.** `#9fe870` on white is about 1.6:1. In light mode the
lime is only ever a fill, carrying an ink label at 13:1, and green-as-text is
handled by `ink-deep` `#163300` instead. Dark mode flips that polarity: on the
ink surface the lime becomes legible text, which is the brand's own
`card-feature-dark`.

**Wise Sans is proprietary.** Manrope at 800 stands in for it, the substitute
the design system names first. Collapsing both roles into Inter would have lost
the display-versus-utility contrast that is the whole typographic story, so the
two-face system is preserved. Numerals use Inter with `tabular-nums` rather than
adding a third family, which also keeps readouts from reflowing mid-scrub.

## Colour

Two systems, kept strictly apart, both defined in `app/globals.css`.

_Chrome_ is the sage canvas, white cards, olive ink, and the single lime accent.
The lime never enters the hazard ramp. Wise reserves it for actions, and here
that rule protects something safety critical: a button can never be mistaken for
an all-clear.

_Hazard_ is a five-stop ramp carrying the advisory levels, derived from Wise's
semantic palette rather than invented: the positive family for safe, the warning
family for Caution and Extreme Caution, the negative family for Danger. Extreme
Danger flips polarity to a dark maroon fill with light text, which is the
brand's `badge-negative`. It is the only band that breaks the pale-tint pattern,
and breaking the pattern is the point.

Colour never carries meaning alone. Every band is paired with a written label
and a numeric range, and Extreme Danger additionally carries a hatch, because
severe red and extreme maroon flatten into each other under protanopia and that
is the one distinction where being wrong is dangerous.

Every text and background pairing was measured against WCAG AA in both schemes,
and every hazard fill against the 3:1 needed for a meaningful graphic. Opacity is
never applied to text, since it silently lowers contrast; hierarchy comes from
size and weight instead.

## Layout rules

- Radius follows the brand: 24px panels and buttons, 16px cards, 12px inputs,
  8px chips, full pills for status badges.
- Cards are flat. Surface contrast, white on sage, is the elevation, so panels
  carry no border and no shadow. The chart's tracks invert that relationship,
  sitting as sage insets on a white card.
- One theme for the whole page. Sections never invert, apart from the footer,
  which is its own band. In light mode that is the brand ink against the sage
  page; in dark mode the page is already ink, so the footer lifts to a deep olive
  instead of vanishing into the background.
- The header stays on a single 64px row at every breakpoint.
- Every multi-column layout declares its single-column fallback below 768px.
- The level rail carries a short form of every band name, because a narrow rail
  truncates "Extreme Caution" into something unreadable. Below 640px the chart
  also drops to its smaller track heights and the page to tighter padding, which
  together keep the twenty-four columns wide enough to aim at.
- The chart is responsive rather than horizontally scrollable, so a touch drag
  along it is never ambiguous with a scroll.

## Motion

One easing vocabulary, defined once in `app/globals.css`. Every duration sits
under 300ms.

The rules that shaped it:

- **Only transform and opacity animate.** The playhead and the two rail markers
  are positioned by transform rather than by top or bottom, so following a scrub
  costs a composite rather than a layout pass. The markers translate by a
  percentage of their own full-height wrapper, which is what lets the chart be
  resized in CSS without any of that maths changing.
- **Keyboard scrubbing does not animate.** A held arrow key repeats many times a
  second, and easing on that reads as lag. The same control animates under a
  pointer and moves instantly under a key.
- **The numbers snap, the colours transition.** Digits change on every pointer
  move during a scrub, and anything that crossfades at that rate turns to mush.
  Crossing from Caution into Danger is rare and meaningful, so the band colour
  gets 260ms.
- **Transitions, not keyframes.** A scrub retargets constantly and keyframes
  restart from zero on every hour crossed.
- **Nothing appears from nothing.** The results popover enters at scale 0.97
  from its trigger edge, never from scale 0 or from its own centre.
- **No flickering affordances.** The live/back-to-now control is always
  rendered and only changes its label, because during a hover scrub an
  appearing chip would flash in and out several times a second.
- **Everything collapses under `prefers-reduced-motion`**, keeping the opacity
  and colour changes that carry meaning and dropping the movement.

No animation library. The interactions here are discrete and CSS transitions run
off the main thread, which matters more on a mid-range Android phone during a
storm than any ergonomic gain from a spring API.

## Correctness

Heat index is computed from raw temperature and humidity rather than read from a
forecast field. The implementation is the full National Weather Service
reference: the Rothfusz regression, its dry-air and humid-air corrections, and
the Steadman fallback below 80F. Without the corrections the regression drifts
badly in dry or very humid air, which is exactly the Philippine case.

`npm test` checks the output against published NWS table values, exercises all
three branches, and verifies every PAGASA band boundary, the ordering rules for
generated advice, the scrub position mapping, and escalation detection.

## Data

Open-Meteo, revalidated every ten minutes. No API key. When the service cannot
be reached the dashboard says so and shows no advisory level, rather than
displaying a stale or zeroed reading during a storm.

## What the checks cannot reach

`npm run verify` covers types, lint, formatting, the hazard maths, and the
stylesheet's support contract. Two ARIA rules in the lint config —
`role-supports-aria-props` and `aria-role` — catch the structural half of the
search listbox: a property a role does not accept, a role that does not exist,
a misspelled `aria-*`. None of that tells you what a screen reader says.

The one thing worth checking by ear is the **grouped listbox**. When no exact
match exists, the broader results are wrapped in `role="group"` whose accessible
name comes from the visible "No exact match. Nearest covered area:" heading via
`aria-labelledby`. That is correct per spec, and support for announcing group
boundaries inside a listbox is the part that differs between screen readers.

Five minutes, with NVDA on Windows or VoiceOver on macOS:

| Step                                     | Expected                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Focus the search field, type `luc`       | "Searching", then "N places found"                                                                                       |
| Arrow down through the results           | Each place announced as you land on it, not the whole list                                                               |
| Type `sampaloc` to force broader matches | Entering the second run announces the group: "No exact match. Nearest covered area"                                      |
| Press Tab from the field                 | Focus leaves the control entirely — it must not walk the options                                                         |
| Tab to the chart, press Right            | "Forecast for 3 PM PHT. Heat index 41.2 degrees Celsius, Danger. Rainfall 2.3 millimetres per hour, no warning. Pinned." |
| Keep pressing Right                      | One announcement per hour. The verdict above must not re-read itself.                                                    |

If the group name is not announced, the fix is to stop relying on the group for
it: put the qualifier into each broader option's own accessible name instead, so
the information travels with the option rather than with its container.

## Browser support

```
chrome >= 111   edge >= 111   firefox >= 128   safari >= 16.4   ios_saf >= 16.4
```

This is Tailwind v4's own floor, not a separate choice. Its colour utilities
compile to `color-mix(in oklab, …)` with custom-property operands, which cannot
be lowered to anything older, so the framework sets the baseline and the project
matches it exactly rather than drifting above it.

**The palette would otherwise have raised that floor by a year.** It is authored
once, as `light-dark()` pairs, which needs Chrome 123 and Safari 17.5 — well
above the framework. Lightning CSS lowers those pairs to a custom-property
toggle for the browsers listed here, so the single source survives and the
supported range does not shrink.

That lowering is load-bearing and fails quietly. Custom properties are not
validated until they are substituted, so if the floor is ever raised past
`light-dark()` support the compilation silently stops rewriting it, the build
succeeds, and every colour in the interface resolves to `transparent` on the
browsers that just dropped off — during a storm, on the phones least likely to
be new. `npm run build` runs `scripts/check-css.mts`, which fails the build if a
raw `light-dark()` ever reaches the stylesheet.

Two things degrade rather than break below the entry animations' own support
(Chrome 117, Safari 17.4): `@starting-style` and `transition-behavior:
allow-discrete`. The search results appear and disappear without animating,
which is what they did before the animation existed.

## Structure

```
app/
  page.tsx              dashboard, data fetch, URL validation
  layout.tsx            fonts, metadata, pre-paint theme bootstrap
  globals.css           design tokens for both schemes, motion vocabulary
  loading.tsx           skeleton matching the real layout
  error.tsx             boundary
  api/places/route.ts   place lookup
lib/
  heat-index.ts         Rothfusz regression, PAGASA heat bands
  rainfall.ts           PAGASA rainfall warning bands
  advisories.ts         the deterministic PAGASA advice engine
  advice/               prompt, Gemini call, validation, caching, fallback
  geocode.ts            place search, comma parsing and qualifier ranking
  place-url.ts          place to shareable URL
  projection.ts         per-hour hazard views and escalation detection
  scrub.ts              pointer position to hour index
  chart.ts              the two scales, bar geometry, and rail segments
  tone.ts               level to ramp-stop mapping shared by both hazards
  open-meteo.ts         data layer
  format.ts             timezone-safe timestamp formatting
components/dashboard/
  hazard-console.tsx    owns scrub state, client island
  status-band.tsx       the verdict, and the two readings behind it
  timeline.tsx          scrubbable diverging bar chart
  level-rail.tsx        the advisory bands, drawn as the chart's axis
  observed.tsx          the measured inputs
  locate-button.tsx     geolocation, prompted rather than automatic
  advice-panel.tsx      what to do, streamed behind Suspense
  site-header.tsx       nav, place switcher, theme toggle
  site-footer.tsx       the dark band
tests/
  hazard.test.mts       hazard maths and advice generation
  interaction.test.mts  scrub mapping, projection flagging, escalation
  search.test.mts       comma parsing, qualifier ranking, fallbacks
  chart.test.mts        bar geometry and its monotonicity
  rail.test.mts         rail segments against the classifier
  advice.test.mts       model output validation and rule fallback
```
