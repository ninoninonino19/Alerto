"use client";

import type { CSSProperties } from "react";
import { toneStyle } from "@/lib/tone";
import {
  HEAT_TRACK_VAR,
  RAIN_TRACK_VAR,
  heatFraction,
  heatRailSegments,
  rainFraction,
  rainRailSegments,
  type RailSegment,
} from "@/lib/chart";

const HEAT_SEGMENTS = heatRailSegments();
const RAIN_SEGMENTS = rainRailSegments();

/**
 * The advisory levels, drawn on the same scale as the bars beside them.
 *
 * This is the chart's y axis rather than a legend: a band's position on the
 * rail is exactly the height a bar has to reach to be in that band, so "how far
 * am I from Danger" is answered by looking across rather than by reading a
 * number. It only works because the chart's scale is fixed; on an axis that
 * refits itself every hour the rail would slide around under the reader.
 *
 * A marker sits at each live reading, the way the old threshold ladders did.
 */
export function LevelRail({
  heatValue,
  rainValue,
  heatLevel,
  rainLevel,
  instant,
}: {
  heatValue: number;
  rainValue: number;
  heatLevel: string;
  rainLevel: string;
  instant: boolean;
}) {
  return (
    <div aria-hidden className="w-[84px] shrink-0 select-none sm:w-[132px]">
      <Track
        segments={HEAT_SEGMENTS}
        activeKey={heatLevel}
        height={HEAT_TRACK_VAR}
        marker={heatFraction(heatValue)}
        value={`${heatValue.toFixed(0)}°`}
        instant={instant}
        direction="up"
      />

      <div className="h-0.5 bg-ink" />

      <Track
        segments={RAIN_SEGMENTS}
        activeKey={rainLevel}
        height={RAIN_TRACK_VAR}
        marker={rainFraction(rainValue)}
        value={rainValue.toFixed(1)}
        instant={instant}
        direction="down"
      />
    </div>
  );
}

function Track({
  segments,
  activeKey,
  height,
  marker,
  value,
  instant,
  direction,
}: {
  segments: RailSegment[];
  activeKey: string;
  height: string;
  marker: number;
  value: string;
  instant: boolean;
  direction: "up" | "down";
}) {
  // Both tracks grow away from the centre line, so the one below it is simply
  // the same geometry measured from the other edge.
  const up = direction === "up";
  const edge = up ? "bottom" : "top";

  return (
    <div className="relative overflow-hidden rounded-chip bg-surface" style={{ height }}>
      {segments.map((segment) => {
        const isActive = segment.key === activeKey;
        return (
          <div
            key={segment.key}
            style={
              {
                ...toneStyle(segment.tone),
                [edge]: `${segment.start * 100}%`,
                height: `${segment.size * 100}%`,
              } as CSSProperties
            }
            className={[
              "tone-shift absolute inset-x-0 flex items-center gap-1.5 overflow-hidden pr-1.5",
              isActive ? "bg-[var(--tone-surface)]" : "",
            ].join(" ")}
          >
            <span
              className={[
                "h-full w-1.5 shrink-0 bg-[var(--tone)]",
                isActive ? "" : "opacity-45",
                segment.tone === "extreme" ? "hatch-extreme" : "",
              ].join(" ")}
            />
            <span
              className={[
                "type-finest relative z-10 truncate rounded-sm pr-1 leading-tight",
                isActive
                  ? "bg-[var(--tone-surface)] font-bold text-[var(--tone-text)]"
                  : "bg-surface font-medium text-muted",
              ].join(" ")}
            >
              <span className="sm:hidden">{segment.shortLabel}</span>
              <span className="hidden sm:inline">{segment.label}</span>
            </span>
          </div>
        );
      })}

      {/*
        The marker wrapper spans the whole track, so translating it by a
        percentage of itself moves the line by that share of the track. That
        keeps the movement on the compositor and free of any pixel arithmetic,
        which is what lets the chart resize without touching this file.
      */}
      <div
        data-instant={instant}
        className="ladder-marker pointer-events-none absolute inset-0 z-0"
        style={{ transform: `translateY(${up ? -marker * 100 : marker * 100}%)` }}
      >
        <div className={["absolute inset-x-0 h-0.5 bg-ink", up ? "bottom-0" : "top-0"].join(" ")}>
          <span
            className={[
              "type-finest tabular absolute right-1 rounded-full bg-ink px-1.5 font-bold leading-4 text-raised",
              up ? "-top-2" : "top-1",
            ].join(" ")}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}
