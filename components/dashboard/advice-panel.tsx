import type { CSSProperties } from "react";
import { getAdvice } from "@/lib/advice";
import { toneStyle, type Tone } from "@/lib/tone";
import type { Snapshot } from "@/lib/open-meteo";

/**
 * What to do, for the live reading.
 *
 * This is an async server component behind a Suspense boundary, so the model
 * call streams in after the rest of the page. The readings never wait on it.
 *
 * It is anchored to now rather than to the scrub: what somebody should do right
 * now must not change while they are inspecting the afternoon.
 */
export async function AdvicePanel({
  snapshot,
  tone,
  step,
}: {
  snapshot: Snapshot;
  tone: Tone;
  step: number;
}) {
  const { items, source } = await getAdvice(snapshot);

  if (items.length === 0) {
    return (
      <section
        style={{ "--step": step } as CSSProperties}
        className="enter rounded-panel bg-raised p-8 text-center sm:p-12"
      >
        <h2 className="display text-3xl text-ink">Nothing to act on</h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-base leading-6 text-muted">
          Neither hazard has reached an advisory threshold. Normal outdoor activity, work, and
          classes can proceed.
        </p>
      </section>
    );
  }

  const immediate = items.filter((item) => item.urgency === "act-now");
  const rest = items.filter((item) => item.urgency !== "act-now");

  return (
    <section
      style={{ "--step": step } as CSSProperties}
      aria-labelledby="advice-heading"
      className="enter"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="advice-heading" className="display text-3xl text-ink">
          What to do
        </h2>
        {/*
          Said plainly rather than hidden. Somebody deciding whether to trust
          this is entitled to know which of the two produced it.
        */}
        <p className="text-xs font-medium text-faint">
          {source === "generated" ? "Powered by: Google Gemini" : "Standard PAGASA guidance"}
        </p>
      </div>

      {immediate.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {immediate.map((item) => (
            <li
              key={item.id}
              style={toneStyle(tone)}
              className="rounded-panel bg-[var(--tone-surface)] p-6"
            >
              <h3 className="text-base font-bold leading-6 text-[var(--tone-text)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-5 text-[var(--tone-text)]">{item.detail}</p>
            </li>
          ))}
        </ul>
      )}

      {rest.length > 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item) => (
            <li key={item.id} className="rounded-panel bg-raised p-5">
              <h3 className="text-sm font-bold leading-5 text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-5 text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Shown while the model is answering. Shaped like the real thing so the page
 * does not jump when it arrives.
 */
export function AdviceSkeleton({ step }: { step: number }) {
  return (
    <section
      style={{ "--step": step } as CSSProperties}
      aria-busy="true"
      aria-label="Preparing advice"
      className="enter"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="display text-3xl text-ink">What to do</h2>
        <p className="text-xs font-medium text-faint">Preparing</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[0, 1].map((row) => (
          <div key={row} className="h-[124px] animate-pulse rounded-panel bg-sunken" />
        ))}
      </div>
    </section>
  );
}
