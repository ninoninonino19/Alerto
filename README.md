# Alerto

Live heat index and rainfall advisories for Philippine localities, classified
against PAGASA thresholds. Alerto answers one question first — _am I in danger
right now, and what do I do about it_ — and only then shows the numbers behind
that verdict.

**Live at [alerto-zeta.vercel.app](https://alerto-zeta.vercel.app/).**

It is a Next.js app that pulls hourly weather from Open-Meteo, computes the heat
index itself using the National Weather Service reference formula, sorts the
result into PAGASA's heat and rainfall warning bands, and pairs it with concrete
advice. It opens on Manila, or on your own location if you allow it.

The page is a verdict, a 24-hour chart carrying heat and rainfall on one axis
with the PAGASA bands drawn down its side, and a "What to do" panel. Search any
Philippine locality or use your device location; every reading has a shareable
URL.

> Alerto is not a replacement for an official PAGASA warning.

## Running it

Requires Node.js 20.9 or newer (Node 22 recommended) and npm.

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API key is needed: the weather
data comes from Open-Meteo, which is keyless.

For a production build:

```bash
npm run build
npm start
```

### Optional: AI-written advice

```bash
cp .env.example .env.local
```

Put a key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
in `GEMINI_API_KEY` and restart the dev server. That is the API free tier, which
is separate from a Gemini Advanced or Google One AI subscription. Without a key
the dashboard works exactly the same, showing the rule-derived advice; the panel
always says which of the two you are reading. See
[Advice generation](docs/design-notes.md#advice-generation) for what the model
is and is not allowed to do.

### Scripts

| Command             | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Development server                                     |
| `npm run build`     | Production build, plus the stylesheet check            |
| `npm start`         | Serve the production build                             |
| `npm test`          | Hazard maths, chart geometry, search, and advice tests |
| `npm run lint`      | ESLint                                                 |
| `npm run typecheck` | `tsc --noEmit`                                         |
| `npm run format`    | Prettier write (`format:check` to verify only)         |
| `npm run verify`    | Everything above, in the order CI runs it              |

## Using the dashboard

**Pick a place.** Search in the header — "Lucban, Quezon" works, the qualifier
after the comma ranks the results. Or press the locate button to use your device
location, which is asked for by a button press rather than on page load, and
rounded to roughly a kilometre before it goes anywhere.

**Read the verdict, then the evidence.** The advisory level and the sentence
under it are the answer. The chart below it is the working, and the measured
temperature, humidity, and rainfall are last.

**Scrub the timeline** to inspect any of the next 24 hours:

| Input                     | Effect                                 |
| ------------------------- | -------------------------------------- |
| Hover                     | Preview that hour                      |
| Press / tap               | Pin that hour so the readings stay put |
| `←` `→`                   | Step an hour, pinning it               |
| `Home` / `End`            | Jump to the first or last hour         |
| `Esc` or **Back to live** | Release and return to now              |

A pinned forecast hour is drawn with a dashed outline and labelled "Forecast
for", never "Observed". The escalation line — the first hour worse than now — is
also a button: press it to jump there.

The "What to do" advice always describes _now_, not the hour you are inspecting,
and the theme toggle in the header switches light and dark.

**Share a reading.** The place lives in the URL
(`/?place=Lucban&admin=Quezon&lat=14.1136&lon=121.5560`), so a link opens on the
same locality.

## How it works

- **Data** comes from Open-Meteo, revalidated every ten minutes, no key. When it
  cannot be reached the dashboard says so and shows no advisory level, rather
  than a stale or zeroed reading during a storm.
- **The heat index is computed here**, not read from a forecast field: the full
  NWS reference — the Rothfusz regression, its dry-air and humid-air
  corrections, and the Steadman fallback below 80°F.
- **The bands are PAGASA's**, five for heat and four for rainfall, and the same
  tables drive the classifier, the chart's axis, and the advice.
- **Advice falls back, always.** A model failure of any kind lands on the fixed
  rules in `lib/advisories.ts`, and the panel says which one you are reading.
  Advice depends only on the two hazard bands, so it is cached for a day and the
  whole feature costs at most twenty model calls regardless of traffic.

## Project layout

```
app/          dashboard page, layout, design tokens, place-lookup route
lib/          heat index, rainfall bands, advice engine, geocoding, chart maths
components/   the dashboard's client islands and server components
tests/        hazard maths, chart geometry, search, interaction, advice
scripts/      build-time stylesheet and AI-output checks
docs/         design notes and specifications
```

`npm test` covers the heat-index output against published NWS table values,
every PAGASA band boundary, the chart's monotonicity, the rail's agreement with
the classifier, scrub mapping, escalation detection, search ranking, and the
advice validation and fallback.

## Deployment

Deployed on Vercel:
**[alerto-zeta.vercel.app](https://alerto-zeta.vercel.app/)**.

Any deploy needs no configuration beyond the defaults. `GEMINI_API_KEY` is the
one optional environment variable; without it the deployed app serves the
rule-derived advice.

Browser support is Tailwind v4's own floor — Chrome and Edge 111, Firefox 128,
Safari and iOS Safari 16.4 — and `npm run build` fails if the stylesheet would
break it. [Design notes](docs/design-notes.md#browser-support) explains why.

## Design notes

The reasoning behind the interface — layout, colour, motion, accessibility, and
the decisions that were corrections of earlier ones — is in
**[`docs/design-notes.md`](docs/design-notes.md)**.

## License

MIT. See [LICENSE](LICENSE).
