import { classifyHeat, heatIndexC, type HeatBand } from "./heat-index";
import { classifyRain, threeHourConcern, type RainBand } from "./rainfall";

export type Place = {
  name: string;
  admin: string;
  latitude: number;
  longitude: number;
};

/**
 * Where the dashboard opens when it knows nothing about you.
 *
 * Manila, because it is the capital and the single place the largest number of
 * arrivals will either be in or recognise. Anyone who grants location access
 * never sees it, and anyone who does not can search.
 */
export const DEFAULT_PLACE: Place = {
  name: "Manila",
  admin: "Metro Manila",
  latitude: 14.6042,
  longitude: 120.9822,
};

export type HourlyPoint = {
  time: string;
  temperatureC: number;
  humidity: number;
  precipitation: number;
  heatIndexC: number;
};

export type Snapshot = {
  place: Place;
  observedAt: string;
  temperatureC: number;
  humidity: number;
  windKph: number;
  precipitation: number;
  threeHourAccumulation: number;
  slowFloodRisk: boolean;
  heatIndexC: number;
  heat: HeatBand;
  rain: RainBand;
  hourly: HourlyPoint[];
};

export class WeatherUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherUnavailableError";
  }
}

type ForecastResponse = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
  };
};

export async function fetchSnapshot(place: Place): Promise<Snapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", place.latitude.toString());
  url.searchParams.set("longitude", place.longitude.toString());
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
  );
  url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,precipitation");
  url.searchParams.set("timezone", "Asia/Manila");
  url.searchParams.set("past_hours", "3");
  url.searchParams.set("forecast_hours", "24");

  let response: Response;
  try {
    // Open-Meteo publishes on the hour, so a ten minute window is fresh enough
    // and keeps the dashboard off the API on every request.
    response = await fetch(url, { next: { revalidate: 600 } });
  } catch {
    throw new WeatherUnavailableError("Could not reach the Open-Meteo service.");
  }

  if (!response.ok) {
    throw new WeatherUnavailableError(`Open-Meteo returned ${response.status} for ${place.name}.`);
  }

  const data = (await response.json()) as ForecastResponse;

  if (!data?.current || !data?.hourly?.time?.length) {
    throw new WeatherUnavailableError("Open-Meteo returned an unexpected payload shape.");
  }

  const currentHeatIndex = heatIndexC(
    data.current.temperature_2m,
    data.current.relative_humidity_2m,
  );

  // past_hours=3 puts the three completed hours first, then the current hour.
  const past = data.hourly.precipitation.slice(0, 3);
  const threeHourAccumulation = past.reduce((sum, mm) => sum + (mm ?? 0), 0);

  const hourly: HourlyPoint[] = data.hourly.time.slice(3).map((time, i) => {
    const index = i + 3;
    const temperatureC = data.hourly.temperature_2m[index];
    const humidity = data.hourly.relative_humidity_2m[index];
    return {
      time,
      temperatureC,
      humidity,
      precipitation: data.hourly.precipitation[index] ?? 0,
      heatIndexC: heatIndexC(temperatureC, humidity),
    };
  });

  return {
    place,
    observedAt: data.current.time,
    temperatureC: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    windKph: data.current.wind_speed_10m,
    precipitation: data.current.precipitation,
    threeHourAccumulation,
    slowFloodRisk: threeHourConcern(threeHourAccumulation),
    heatIndexC: currentHeatIndex,
    heat: classifyHeat(currentHeatIndex),
    rain: classifyRain(data.current.precipitation),
    hourly,
  };
}
