"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ArrowUUpLeft } from "@phosphor-icons/react";
import { findEscalation, viewAt } from "@/lib/projection";
import { hourLabel } from "@/lib/format";
import type { Snapshot } from "@/lib/open-meteo";
import { StatusBand } from "./status-band";
import { Timeline, type ScrubState } from "./timeline";

/**
 * Owns the scrub position and hands it to the readings above the chart.
 *
 * There is deliberately only one place on the page where the heat index and
 * rainfall numbers appear. They used to be repeated in a pair of panels below
 * the chart, which put the same two values on screen twice over; the
 * explanations from those panels now sit inside the reading cards they explain.
 *
 * The split of state is deliberate too: the focused hour is React state because
 * it is discrete and only ever takes 24 values, while the playhead that follows
 * the pointer is a CSS transform driven by that state. Nothing continuous goes
 * through React.
 */
export function HazardConsole({ snapshot }: { snapshot: Snapshot }) {
  const [scrub, setScrub] = useState<ScrubState>({
    index: null,
    instant: false,
    locked: false,
  });

  const view = useMemo(() => viewAt(snapshot, scrub.index), [snapshot, scrub.index]);
  const escalation = useMemo(() => findEscalation(snapshot), [snapshot]);

  const scrubbing = scrub.index !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="enter" style={{ "--step": 0 } as CSSProperties}>
        <StatusBand place={snapshot.place} view={view} snapshot={snapshot} />
      </div>

      <section
        aria-labelledby="timeline-heading"
        className="enter rounded-panel bg-raised p-5 sm:p-8"
        style={{ "--step": 1 } as CSSProperties}
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="timeline-heading" className="text-base font-bold text-ink">
            Next 24 hours
          </h2>

          {/*
            Always rendered, never appearing or disappearing. During a hover
            preview this label would otherwise flicker in and out several times
            a second, which is exactly the kind of motion that should not exist.
          */}
          <button
            type="button"
            disabled={!scrubbing}
            onClick={() => setScrub({ index: null, instant: false, locked: false })}
            /* A fixed width keeps the header still when the label swaps. */
            className="touch-target pressable flex h-9 min-w-[132px] items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:bg-surface disabled:text-faint"
          >
            {scrubbing ? (
              <>
                <ArrowUUpLeft size={12} aria-hidden />
                Back to now
              </>
            ) : (
              "Live reading"
            )}
          </button>
        </header>

        {escalation ? (
          <button
            type="button"
            onClick={() => setScrub({ index: escalation.index, instant: false, locked: true })}
            className="pressable hoverable mt-4 text-left text-base leading-6 text-muted"
          >
            Conditions reach <strong className="font-semibold text-ink">{escalation.label}</strong>{" "}
            at{" "}
            <strong className="tabular font-semibold text-ink">{hourLabel(escalation.time)}</strong>
            .{" "}
            <span className="font-semibold text-accent-text underline underline-offset-2">
              Jump to that hour
            </span>
          </button>
        ) : (
          <p className="mt-4 text-base leading-6 text-muted">
            Neither hazard is forecast to worsen beyond its current level in this window.
          </p>
        )}

        <div className="mt-6">
          <Timeline
            points={snapshot.hourly}
            scrub={scrub}
            onScrub={setScrub}
            heatValue={view.heatIndexC}
            rainValue={view.precipitation}
            heatLevel={view.heat.level}
            isProjected={view.isProjected}
            rainLevel={view.rain.level}
          />
        </div>
      </section>
    </div>
  );
}
