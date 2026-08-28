import { Suspense } from "react";
import { CloudSlash } from "@phosphor-icons/react/dist/ssr";
import { HEAT_SEVERITY } from "@/lib/heat-index";
import { RAIN_SEVERITY } from "@/lib/rainfall";
import { HEAT_TONE, RAIN_TONE } from "@/lib/tone";
import { DEFAULT_PLACE, fetchSnapshot, type Place, type Snapshot } from "@/lib/open-meteo";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { HazardConsole } from "@/components/dashboard/hazard-console";
import { Observed } from "@/components/dashboard/observed";
import { AdvicePanel, AdviceSkeleton } from "@/components/dashboard/advice-panel";

type SearchParams = Record<string, string | string[] | undefined>;

function readOne(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Coordinates arrive from the URL, so they are range-checked before use. */
function resolvePlace(params: SearchParams): Place {
  const name = readOne(params, "place");
  const lat = Number(readOne(params, "lat"));
  const lon = Number(readOne(params, "lon"));

  const usable =
    Boolean(name) &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180;

  if (!usable) return DEFAULT_PLACE;

  return {
    name: name!.slice(0, 60),
    admin: (readOne(params, "admin") ?? "Philippines").slice(0, 60),
    latitude: lat,
    longitude: lon,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const place = resolvePlace(params);
  const isDefault = place.name === DEFAULT_PLACE.name;

  const detail = await fetchSnapshot(place).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

  const snapshot = detail.ok ? detail.value : null;
  const failure = detail.ok
    ? null
    : detail.error instanceof Error
      ? detail.error.message
      : "Readings are unavailable.";

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader place={place} isDefault={isDefault} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {snapshot ? (
          <Dashboard snapshot={snapshot} />
        ) : (
          <Unavailable place={place} reason={failure} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * The interactive console owns the scrub position, so it is a client island.
 * Advice and measured inputs stay on the server: they are anchored to the live
 * observation and deliberately do not follow the scrub, because what to do
 * right now should not change while somebody is inspecting the afternoon.
 */
function Dashboard({ snapshot }: { snapshot: Snapshot }) {
  const rainLeads = RAIN_SEVERITY[snapshot.rain.level] > HEAT_SEVERITY[snapshot.heat.level];
  const tone = rainLeads ? RAIN_TONE[snapshot.rain.level] : HEAT_TONE[snapshot.heat.level];

  return (
    <div className="flex flex-col gap-6">
      <HazardConsole snapshot={snapshot} />

      {/*
        The advice waits on a model, so it streams in behind its own boundary.
        Everything above it is already on screen by the time this resolves, and
        the fallback is shaped like the result so nothing jumps when it lands.
      */}
      <Suspense fallback={<AdviceSkeleton step={3} />}>
        <AdvicePanel snapshot={snapshot} tone={tone} step={3} />
      </Suspense>

      <Observed snapshot={snapshot} step={4} />
    </div>
  );
}

/**
 * A weather dashboard that cannot reach its source has to say so plainly.
 * Showing a stale or zeroed reading during a storm would be worse than showing
 * nothing.
 */
function Unavailable({ place, reason }: { place: Place; reason: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-panel bg-raised px-6 py-16 text-center sm:px-8">
        <CloudSlash size={30} className="mx-auto text-faint" aria-hidden />
        <h1 className="display mt-6 text-4xl text-ink">No readings for {place.name}</h1>

        {/*
          The consequence before the recovery. Somebody who opens this during a
          storm has to leave knowing that a blank screen is not an all-clear,
          and that is the one sentence that changes what they do next.
        */}
        <p className="mx-auto mt-4 max-w-[42ch] text-base leading-6 text-muted">
          No advisory level is shown, because guessing one during a storm is worse than showing
          nothing. Treat this as unknown conditions, not as an all-clear.
        </p>

        {/*
          The cause is support, not the headline, so it drops a step in the
          hierarchy. It also used to point at a list of localities that has
          never existed on this screen; the switcher is in the sticky header.
        */}
        <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-5 text-faint">
          {reason ?? "The weather service did not respond."} Try again shortly, or search for
          another locality at the top of the page.
        </p>
      </section>
    </div>
  );
}
