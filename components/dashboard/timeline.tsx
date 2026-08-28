"use client";

import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { classifyHeat } from "@/lib/heat-index";
import { classifyRain } from "@/lib/rainfall";
import { HEAT_TONE, RAIN_TONE, toneStyle } from "@/lib/tone";
import { hourLabel, hourNumber } from "@/lib/format";
import type { HourlyPoint } from "@/lib/open-meteo";
import { indexFromClientX } from "@/lib/scrub";
import {
  HEAT_GUIDES,
  HEAT_TRACK_VAR,
  RAIN_GUIDES,
  RAIN_TRACK_VAR,
  barStyle,
  heatFraction,
  rainFraction,
} from "@/lib/chart";
import { LevelRail } from "./level-rail";

export type ScrubState = { index: number | null; instant: boolean; locked: boolean };

/**
 * What the slider says out loud.
 *
 * The band names are the whole point. A heat index of 41 means nothing to
 * somebody who does not carry PAGASA's thresholds in their head, and the rail
 * that names them is a visual axis: it is aria-hidden because reading a stack
 * of range labels on every arrow press would be unusable. So the classification
 * has to travel with the number instead.
 *
 * The wording tracks the reading cards exactly, including "No warning" versus
 * "Orange warning", so what is heard and what is on screen are the same
 * sentence. The rain levels are colours because PAGASA's are; that is the
 * official name of the advisory, not a description of it.
 */
function describeReading(heatIndexC: number, precipitation: number): string {
  const heat = classifyHeat(heatIndexC);
  const rain = classifyRain(precipitation);
  const rainStatus = rain.label === "No warning" ? "no warning" : `${rain.label} warning`;

  return (
    `Heat index ${heatIndexC.toFixed(1)} degrees Celsius, ${heat.label}. ` +
    `Rainfall ${precipitation.toFixed(1)} millimetres per hour, ${rainStatus}.`
  );
}

/**
 * One hour's bar.
 *
 * Memoised because the only prop that changes during a scrub is `active`, and
 * it changes on exactly two of the forty-eight bars: the one being left and the
 * one being entered. The other forty-six stop at the shallow compare.
 *
 * That only holds because `style` is a stable object from the memo below. Built
 * inline, it would be a new object every move and every bar would re-render
 * anyway, which is the bug this pair of changes exists to remove.
 */
const Bar = memo(function Bar({
  style,
  hatch,
  active,
}: {
  style: CSSProperties;
  hatch: boolean;
  active: boolean;
}) {
  return (
    <div className="flex-1 px-[0.5px]">
      <span
        style={style}
        data-active={active}
        className={["bar block w-full bg-[var(--tone)]", hatch ? "hatch-extreme" : ""].join(" ")}
      />
    </div>
  );
});

type Props = {
  points: HourlyPoint[];
  scrub: ScrubState;
  onScrub: (next: ScrubState) => void;
  /** The reading the rail marks, which follows the scrub. */
  heatValue: number;
  rainValue: number;
  heatLevel: string;
  rainLevel: string;
  /** Whether the hour the readings describe is a forecast rather than an observation. */
  isProjected: boolean;
};

/**
 * Twenty-four hours of both hazards on one axis, and the control that drives
 * the readings above it.
 *
 * Pressing pins the reading to that hour, so it can be studied without the
 * pointer having to stay still; hovering only previews while nothing is pinned.
 * Arrow keys pin too, since pressing a key is as deliberate as a click, and
 * they move without easing because a held key repeats several times a second.
 */
export function Timeline({
  points,
  scrub,
  onScrub,
  heatValue,
  rainValue,
  heatLevel,
  rainLevel,
  isProjected,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingId = useRef<number | null>(null);

  /*
   * The track's box, measured once per gesture rather than once per move.
   *
   * getBoundingClientRect forces the browser to resolve layout before it can
   * answer, and it was being asked on every pointermove — including hover
   * previews, which fire without any button held. The rect cannot change
   * mid-gesture unless the page scrolls or resizes, so those two events clear
   * it and the next move pays for one read.
   */
  const rectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    function invalidate() {
      rectRef.current = null;
    }
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  const columnWidth = 100 / points.length;

  function indexAt(clientX: number): number {
    let rect = rectRef.current;
    if (!rect) {
      rect = trackRef.current?.getBoundingClientRect() ?? null;
      rectRef.current = rect;
    }
    if (!rect) return 0;
    return indexFromClientX(clientX, rect, points.length);
  }

  /*
   * Bar geometry depends on the hours, not on the scrub, so it is built once
   * per forecast rather than once per pointer move. Holding the style objects
   * by identity is also what lets the memoised Bar above bail out.
   */
  const bars = useMemo(
    () =>
      points.map((point) => {
        const heatTone = HEAT_TONE[classifyHeat(point.heatIndexC).level];
        const rainTone = RAIN_TONE[classifyRain(point.precipitation).level];

        return {
          key: point.time,
          heatStyle: {
            ...toneStyle(heatTone),
            ...barStyle(heatFraction(point.heatIndexC), HEAT_TRACK_VAR),
          } as CSSProperties,
          heatHatch: heatTone === "extreme",
          rainStyle: {
            ...toneStyle(rainTone),
            ...barStyle(rainFraction(point.precipitation), RAIN_TRACK_VAR),
          } as CSSProperties,
        };
      }),
    [points],
  );

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Ignore every pointer after the first. Without this, putting a second
    // finger down mid-drag makes the playhead jump to it.
    if (draggingId.current !== null) return;
    draggingId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    onScrub({ index: indexAt(event.clientX), instant: false, locked: true });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (draggingId.current === event.pointerId) {
      onScrub({ index: indexAt(event.clientX), instant: false, locked: true });
      return;
    }
    // Hover previews, but only while nothing is pinned.
    if (event.pointerType !== "mouse" || scrub.locked) return;
    onScrub({ index: indexAt(event.clientX), instant: false, locked: false });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (draggingId.current !== event.pointerId) return;
    draggingId.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onPointerLeave() {
    if (draggingId.current !== null || scrub.locked) return;
    onScrub({ index: null, instant: false, locked: false });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = scrub.index ?? 0;
    let next: number;

    if (event.key === "ArrowRight") next = Math.min(points.length - 1, current + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = points.length - 1;
    else if (event.key === "Escape") {
      onScrub({ index: null, instant: true, locked: false });
      return;
    } else return;

    event.preventDefault();
    onScrub({ index: next, instant: true, locked: true });
  }

  const active = scrub.index;
  const activePoint = active === null ? null : points[active];

  return (
    /*
      One attribute drives everything that changes across the whole control
      while a scrub is live: which bars step back, and whether the two moving
      elements are worth a compositor layer. The bars and the rail are siblings,
      so the flag lives on the element that contains both.
    */
    <div className="scrub-scope flex gap-2 sm:gap-3" data-scrubbing={active !== null}>
      <LevelRail
        heatValue={heatValue}
        rainValue={rainValue}
        heatLevel={heatLevel}
        rainLevel={rainLevel}
        instant={scrub.instant}
      />

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Scrub the 24 hour forecast"
        aria-valuemin={0}
        aria-valuemax={points.length - 1}
        aria-valuenow={active ?? 0}
        aria-valuetext={
          activePoint
            ? /*
                Forecast or observed, in the same words the band above uses.
                The flag is load-bearing rather than cosmetic — see the note on
                HazardView — and with the band no longer a live region this is
                the only place the distinction reaches a screen reader.
              */
              `${isProjected ? "Forecast for" : "Observed"} ${hourLabel(activePoint.time)} PHT. ` +
              describeReading(activePoint.heatIndexC, activePoint.precipitation) +
              (scrub.locked ? " Pinned." : "")
            : /*
                heatValue and rainValue follow the scrub, so with no hour
                selected they are the live observation. "Live reading" is the
                label on the button that returns here.
              */
              `Live reading. ${describeReading(heatValue, rainValue)}`
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!scrub.locked) onScrub({ index: null, instant: true, locked: false });
        }}
        className="relative min-w-0 flex-1 cursor-ew-resize touch-pan-y select-none rounded-card outline-offset-4"
      >
        <div className="relative" style={{ height: HEAT_TRACK_VAR }}>
          {HEAT_GUIDES.map((guide) => (
            <span
              key={guide}
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-guide"
              style={{ bottom: `${heatFraction(guide) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {bars.map((hour, index) => (
              <Bar
                key={hour.key}
                style={hour.heatStyle}
                hatch={hour.heatHatch}
                active={index === active}
              />
            ))}
          </div>
        </div>

        {/* The safe line. Both hazards are measured away from it. */}
        <div className="h-0.5 bg-ink" aria-hidden />

        <div className="relative" style={{ height: RAIN_TRACK_VAR }}>
          {RAIN_GUIDES.map((guide) => (
            <span
              key={guide}
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-guide"
              style={{ top: `${rainFraction(guide) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-start">
            {bars.map((hour, index) => (
              <Bar key={hour.key} style={hour.rainStyle} hatch={false} active={index === active} />
            ))}
          </div>
        </div>

        {/*
          The playhead is exactly one column wide and moves in whole-column
          steps, so translateX(100%) lands on the next hour. No layout property
          is touched, and columns use padding rather than gap so the arithmetic
          stays exact across all 24 steps.
        */}
        <div
          aria-hidden
          data-instant={scrub.instant}
          className="playhead pointer-events-none absolute left-0 top-0"
          style={{
            width: `${columnWidth}%`,
            height: `calc(${HEAT_TRACK_VAR} + ${RAIN_TRACK_VAR} + 2px)`,
            transform: `translateX(${(active ?? 0) * 100}%)`,
            opacity: active === null ? 0 : 1,
          }}
        >
          <div
            className={[
              "h-full w-full rounded-chip",
              scrub.locked
                ? "bg-ink/[0.06] ring-2 ring-inset ring-ink/40"
                : "bg-ink/[0.03] ring-1 ring-inset ring-ink/20",
            ].join(" ")}
          />

          {activePoint && (
            <span
              className={[
                "type-fine tabular absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-bold",
                scrub.locked ? "bg-accent text-accent-ink" : "bg-ink text-raised",
              ].join(" ")}
            >
              {hourLabel(activePoint.time)}
            </span>
          )}
        </div>

        <div aria-hidden className="hour-ticks mt-2 flex">
          {points.map((point) => {
            const hour = hourNumber(point.time);
            return (
              <span
                key={point.time}
                className="type-fine tabular flex-1 text-center font-medium leading-none text-faint"
              >
                <span className={hour % 6 === 0 ? "" : "hidden sm:inline"}>
                  {hour % 3 === 0 ? hourLabel(point.time) : ""}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
