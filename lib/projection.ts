import { classifyHeat, HEAT_SEVERITY, type HeatBand } from "./heat-index";
import { classifyRain, RAIN_SEVERITY, type RainBand } from "./rainfall";
import type { Snapshot } from "./open-meteo";

/**
 * One hour's worth of hazard state, whether observed now or projected later.
 *
 * `isProjected` is not cosmetic. Presenting a forecast level with the same
 * authority as an observation is the kind of mistake that gets somebody caught
 * outdoors, so the flag travels with the data and the interface is required to
 * mark it.
 */
export type HazardView = {
  time: string;
  isProjected: boolean;
  temperatureC: number;
  humidity: number;
  heatIndexC: number;
  heat: HeatBand;
  precipitation: number;
  rain: RainBand;
  rainLeads: boolean;
  calm: boolean;
};

function view(
  time: string,
  isProjected: boolean,
  temperatureC: number,
  humidity: number,
  heatIndexC: number,
  precipitation: number,
): HazardView {
  const heat = classifyHeat(heatIndexC);
  const rain = classifyRain(precipitation);
  return {
    time,
    isProjected,
    temperatureC,
    humidity,
    heatIndexC,
    heat,
    precipitation,
    rain,
    rainLeads: RAIN_SEVERITY[rain.level] > HEAT_SEVERITY[heat.level],
    calm: HEAT_SEVERITY[heat.level] === 0 && RAIN_SEVERITY[rain.level] === 0,
  };
}

/** `index` of null means the live observation. */
export function viewAt(snapshot: Snapshot, index: number | null): HazardView {
  if (index === null) {
    return view(
      snapshot.observedAt,
      false,
      snapshot.temperatureC,
      snapshot.humidity,
      snapshot.heatIndexC,
      snapshot.precipitation,
    );
  }
  const point = snapshot.hourly[Math.min(index, snapshot.hourly.length - 1)];
  return view(
    point.time,
    index > 0,
    point.temperatureC,
    point.humidity,
    point.heatIndexC,
    point.precipitation,
  );
}

export type Escalation = {
  index: number;
  time: string;
  kind: "heat" | "rain";
  label: string;
};

/**
 * The first hour in the window that is worse than right now.
 *
 * This is the fact people actually open a hazard dashboard to find, and it is
 * buried in a 24 point series. Computing it means nobody has to read the chart
 * carefully to notice that the afternoon turns dangerous.
 */
export function findEscalation(snapshot: Snapshot): Escalation | null {
  const heatNow = HEAT_SEVERITY[snapshot.heat.level];
  const rainNow = RAIN_SEVERITY[snapshot.rain.level];

  for (let index = 1; index < snapshot.hourly.length; index++) {
    const point = snapshot.hourly[index];
    const heat = classifyHeat(point.heatIndexC);
    const rain = classifyRain(point.precipitation);

    if (RAIN_SEVERITY[rain.level] > rainNow) {
      return { index, time: point.time, kind: "rain", label: `${rain.label} rainfall warning` };
    }
    if (HEAT_SEVERITY[heat.level] > heatNow) {
      return { index, time: point.time, kind: "heat", label: heat.label };
    }
  }

  return null;
}
