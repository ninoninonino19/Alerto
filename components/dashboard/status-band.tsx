"use client";

import type { ReactNode } from "react";
import { CloudRain, Thermometer } from "@phosphor-icons/react";
import { HEAT_BANDS } from "@/lib/heat-index";
import { RAIN_BANDS } from "@/lib/rainfall";
import { HEAT_TONE, RAIN_TONE, toneStyle, type Tone } from "@/lib/tone";
import { hourLabel } from "@/lib/format";
import type { HazardView } from "@/lib/projection";
import type { Place, Snapshot } from "@/lib/open-meteo";

const CALM_HEADLINE = "No active advisory";
const CALM_EFFECT =
  "Heat index and rainfall are both below the levels at which PAGASA issues an advisory.";

/*
 * Scrubbing changes every string in this band, and each one is a different
 * length, so the band used to grow and shrink under the pointer and shove the
 * rest of the page around with it.
 *
 * Rather than guess a fixed height, the longest string each slot can ever hold
 * is rendered invisibly in the same grid cell as the real one. The cell sizes
 * to the reservation, the visible text sits on top of it, and the height stops
 * moving. Deriving the reservation from the same tables the text comes from
 * means it stays correct if the wording ever changes.
 */
const longest = (values: string[]) =>
  values.reduce((best, value) => (value.length > best.length ? value : best), "");

/*
 * Rain only supplies the headline when it is the more severe hazard, which
 * cannot happen while it is below its first warning level. Including that band
 * reserved space for "No warning rainfall warning", a string this component can
 * never render.
 */
const LEADING_RAIN = RAIN_BANDS.filter((band) => band.level !== "none");

const HEADLINE_RESERVE = longest([
  CALM_HEADLINE,
  ...HEAT_BANDS.map((band) => band.label),
  ...LEADING_RAIN.map((band) => `${band.label} rainfall warning`),
]);

const EFFECT_RESERVE = longest([
  CALM_EFFECT,
  ...HEAT_BANDS.map((band) => band.effect),
  ...LEADING_RAIN.map((band) => band.effect),
]);

const HEAT_DETAIL_RESERVE = "Humidity at 100% makes 45.0°C air feel +18.0°C hotter to the body.";

const RAIN_DETAIL_RESERVE =
  "999.9 mm has fallen in the last three hours. That has passed 65 mm, which PAGASA treats as " +
  "red-level flooding even when the hourly rate stays lower.";

/** Stacks a visible node on top of an invisible height reservation. */
function Reserved({ reserve, children }: { reserve: string; children: ReactNode }) {
  return (
    <span className="grid">
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {reserve}
      </span>
      <span className="col-start-1 row-start-1">{children}</span>
    </span>
  );
}

/**
 * The verdict, and the two readings behind it.
 *
 * Each reading carries its own explanation here rather than in a second pair of
 * panels further down. The heat index means nothing without the humidity that
 * produced it, and the hourly rainfall means little without the three hour
 * total, so those sentences belong beside the numbers they explain.
 *
 * Observed readings are flat, like every other surface in this system. A
 * projection is marked by the dashed outline and by the line under the effect.
 * That distinction is load-bearing: presenting a forecast level with the
 * authority of a measurement is how somebody ends up caught outdoors.
 */
export function StatusBand({
  place,
  view,
  snapshot,
}: {
  place: Place;
  view: HazardView;
  snapshot: Snapshot;
}) {
  const tone: Tone = view.rainLeads ? RAIN_TONE[view.rain.level] : HEAT_TONE[view.heat.level];
  const headline = view.rainLeads ? `${view.rain.label} rainfall warning` : view.heat.label;
  const effect = view.rainLeads ? view.rain.effect : view.heat.effect;
  const uplift = view.heatIndexC - view.temperatureC;

  return (
    <section
      style={toneStyle(tone)}
      aria-labelledby="status-heading"
      /*
       * Deliberately not a live region.
       *
       * It was one, and the region wrapped the headline, the effect sentence,
       * the timestamp and both reading cards. A scrub rewrites all of them, so
       * every pointer move and every arrow press queued the whole band for
       * re-reading, on top of the slider announcing its own value. The result
       * was two overlapping announcements several sentences long, several times
       * a second.
       *
       * The slider owns scrub announcements now: its aria-valuetext carries the
       * hour, both readings, both band names, and whether the hour is observed
       * or forecast. One change, one announcement, from the control that caused
       * it.
       */
      /*
       * The border is always here. Adding it only for a projection made the
       * band four pixels taller the moment the scrub left the current hour,
       * which shifted everything below it.
       */
      className={[
        "tone-shift overflow-hidden rounded-panel border-2 border-dashed bg-[var(--tone-surface)]",
        view.isProjected ? "border-[var(--tone-edge)]" : "border-transparent",
      ].join(" ")}
    >
      <div className="grid gap-6 p-5 sm:gap-8 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--tone-text)]">
            {place.name}, {place.admin}
          </p>

          {/*
            The one ramp in the interface that is hand-set rather than taken
            from the scale, and the only place that is true.

            32 / 52 / 68 are off Tailwind's steps deliberately. This is the
            display face at 800 with leading below its own size, where the
            spacing between sizes has to be read rather than calculated: 36 is
            not enough of a hero at 375px, and 60 crowds the longest headline
            this slot can hold, "Extreme Danger rainfall warning", against the
            reading cards at the lg breakpoint.

            It is left as three steps rather than a clamp() because the height
            here is reserved from the longest possible string, and a fluid size
            would make that reservation resolve differently at every width.
          */}
          <h1
            id="status-heading"
            className="display mt-3 text-[32px] text-[var(--tone-text)] sm:text-[52px] lg:text-[68px]"
          >
            <Reserved reserve={HEADLINE_RESERVE}>{view.calm ? CALM_HEADLINE : headline}</Reserved>
          </h1>

          <p className="mt-5 max-w-[52ch] text-base leading-6 text-[var(--tone-text)]">
            <Reserved reserve={EFFECT_RESERVE}>{view.calm ? CALM_EFFECT : effect}</Reserved>
          </p>

          <p className="tabular mt-6 text-sm font-semibold text-[var(--tone-text)]">
            {view.isProjected
              ? `Forecast for ${hourLabel(view.time)} PHT`
              : `Observed ${hourLabel(view.time)} PHT`}
          </p>
        </div>

        <dl className="flex flex-col justify-center gap-3">
          <Reading
            icon={<Thermometer size={20} aria-hidden />}
            tone={HEAT_TONE[view.heat.level]}
            term="Heat index"
            value={`${view.heatIndexC.toFixed(1)}°C`}
            status={view.heat.label}
            dominant={!view.rainLeads && !view.calm}
            reserve={HEAT_DETAIL_RESERVE}
          >
            Humidity at {Math.round(view.humidity)}% makes {view.temperatureC.toFixed(1)}
            {"°C"} air feel{" "}
            <strong className="tabular font-semibold text-ink">
              {uplift >= 0 ? "+" : ""}
              {uplift.toFixed(1)}
              {"°C"}
            </strong>{" "}
            {uplift >= 0 ? "hotter" : "cooler"} to the body.
          </Reading>

          <Reading
            icon={<CloudRain size={20} aria-hidden />}
            tone={RAIN_TONE[view.rain.level]}
            term="Rainfall"
            value={`${view.precipitation.toFixed(1)} mm/h`}
            status={view.rain.label === "No warning" ? "No warning" : `${view.rain.label} warning`}
            dominant={view.rainLeads}
            reserve={RAIN_DETAIL_RESERVE}
          >
            {view.isProjected ? (
              "Expected accumulation within this hour."
            ) : (
              <>
                <strong className="tabular font-semibold text-ink">
                  {snapshot.threeHourAccumulation.toFixed(1)} mm
                </strong>{" "}
                has fallen in the last three hours.
                {snapshot.slowFloodRisk &&
                  " That has passed 65 mm, which PAGASA treats as red-level flooding even when the hourly rate stays lower."}
              </>
            )}
          </Reading>
        </dl>
      </div>
    </section>
  );
}

/**
 * A white card on the tinted band. Surface contrast is the elevation, so there
 * is no border and no shadow; the dominant hazard is marked with a ring, which
 * costs no layout.
 */
function Reading({
  icon,
  tone,
  term,
  value,
  status,
  dominant,
  reserve,
  children,
}: {
  icon: ReactNode;
  tone: Tone;
  term: string;
  value: string;
  status: string;
  dominant: boolean;
  reserve: string;
  children: ReactNode;
}) {
  return (
    <div
      style={toneStyle(tone)}
      className={[
        "tone-shift rounded-card bg-raised p-4",
        dominant ? "ring-2 ring-[var(--tone-edge)]" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span className="tone-shift shrink-0 text-[var(--tone)]">{icon}</span>
        <dt className="min-w-0 flex-1 truncate text-xs font-semibold text-faint">{term}</dt>
        <span className="type-fine tone-shift shrink-0 rounded-full bg-[var(--tone-surface)] px-2.5 py-1 font-semibold text-[var(--tone-text)]">
          {status}
        </span>
      </div>
      <dd className="mt-2">
        <span className="tabular display block text-3xl text-ink">{value}</span>
        <span className="mt-2 block text-sm leading-5 text-muted">
          <Reserved reserve={reserve}>{children}</Reserved>
        </span>
      </dd>
    </div>
  );
}
