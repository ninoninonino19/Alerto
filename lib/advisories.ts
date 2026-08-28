/*
 * The deterministic advice engine.
 *
 * These rules are PAGASA-derived and name the concrete Philippine actions:
 * class suspension, barangay evacuation, shaded work breaks. They serve two
 * purposes now. They ground the prompt in lib/advice, so a model is rewriting
 * approved guidance rather than inventing safety instructions. And they are the
 * fallback whenever the model is unconfigured, rate limited, slow, or returns
 * something that fails validation.
 *
 * Every one of the twenty heat and rainfall band pairs must resolve to advice
 * here, which tests/advice.test.mts checks. If that stops being true, a failure
 * of the model becomes an empty panel during a storm.
 */
import { HEAT_SEVERITY, type HeatBand } from "./heat-index";
import { RAIN_SEVERITY, type RainBand } from "./rainfall";

export type AdvisoryUrgency = "act-now" | "prepare" | "advice";
export type AdvisoryIcon = "school" | "work" | "health" | "water" | "evacuate" | "drive" | "phone";

export type Advisory = {
  id: string;
  urgency: AdvisoryUrgency;
  icon: AdvisoryIcon;
  /** Imperative, one line, no more than about six words. */
  title: string;
  detail: string;
  source: "heat" | "rain";
};

const HEAT_ADVISORIES: Record<string, Advisory[]> = {
  caution: [
    {
      id: "heat-hydrate",
      urgency: "advice",
      icon: "water",
      title: "Drink before you feel thirsty",
      detail:
        "Thirst lags behind fluid loss. Take water every 20 minutes during any sustained outdoor activity.",
      source: "heat",
    },
    {
      id: "heat-reschedule",
      urgency: "advice",
      icon: "work",
      title: "Move hard work off midday",
      detail:
        "Shift physically demanding tasks to before 09:00 or after 16:00, when the apparent temperature drops.",
      source: "heat",
    },
  ],
  "extreme-caution": [
    {
      id: "heat-pe",
      urgency: "prepare",
      icon: "school",
      title: "Suspend outdoor PE and drills",
      detail:
        "Move physical education, flag ceremonies, and athletic practice indoors or to a shaded area.",
      source: "heat",
    },
    {
      id: "heat-breaks",
      urgency: "prepare",
      icon: "work",
      title: "Give shaded breaks every hour",
      detail:
        "Outdoor workers need at least 15 minutes of shade and water per hour worked at this heat index.",
      source: "heat",
    },
    {
      id: "heat-watch",
      urgency: "advice",
      icon: "health",
      title: "Watch for cramps and dizziness",
      detail:
        "Muscle cramps, heavy sweating, and light-headedness are the first signs of heat exhaustion. Stop and cool down.",
      source: "heat",
    },
  ],
  danger: [
    {
      id: "heat-classes",
      urgency: "act-now",
      icon: "school",
      title: "Move classes online or suspend",
      detail:
        "Local government units and school heads should consider asynchronous classes for the rest of the day.",
      source: "heat",
    },
    {
      id: "heat-outdoor-work",
      urgency: "act-now",
      icon: "work",
      title: "Stop non-essential outdoor work",
      detail:
        "Construction, field, and delivery work in direct sun should pause until the heat index falls below 42C.",
      source: "heat",
    },
    {
      id: "heat-check-in",
      urgency: "prepare",
      icon: "health",
      title: "Check on elderly and infants",
      detail:
        "People over 65, infants, and those on cardiovascular medication lose heat tolerance first. Visit or call them.",
      source: "heat",
    },
  ],
  "extreme-danger": [
    {
      id: "heat-stay-in",
      urgency: "act-now",
      icon: "health",
      title: "Stay indoors and out of the sun",
      detail:
        "Heat stroke is imminent at this apparent temperature. Any outdoor exposure carries immediate risk.",
      source: "heat",
    },
    {
      id: "heat-emergency",
      urgency: "act-now",
      icon: "phone",
      title: "Treat collapse as heat stroke",
      detail:
        "Confusion, dry hot skin, or fainting is a medical emergency. Cool the person aggressively and call 911.",
      source: "heat",
    },
  ],
};

const RAIN_ADVISORIES: Record<string, Advisory[]> = {
  yellow: [
    {
      id: "rain-monitor",
      urgency: "advice",
      icon: "water",
      title: "Watch the next hourly update",
      detail:
        "Rainfall at this rate floods low-lying streets only if it persists. The next reading decides.",
      source: "rain",
    },
    {
      id: "rain-vehicles",
      urgency: "advice",
      icon: "drive",
      title: "Move vehicles off riverside streets",
      detail:
        "Creek-side and canal-side parking is the first to go under in urban runoff flooding.",
      source: "rain",
    },
  ],
  orange: [
    {
      id: "rain-ready-bag",
      urgency: "prepare",
      icon: "evacuate",
      title: "Ready a go-bag and documents",
      detail:
        "Pack medicine, identification, water, and a power bank in case the barangay calls for evacuation.",
      source: "rain",
    },
    {
      id: "rain-no-crossing",
      urgency: "act-now",
      icon: "water",
      title: "Do not cross flowing water",
      detail:
        "Ankle-deep moving water is enough to sweep an adult off their feet. Knee-deep will move a car.",
      source: "rain",
    },
    {
      id: "rain-classes",
      urgency: "prepare",
      icon: "school",
      title: "Expect class and work suspension",
      detail:
        "Orange-level rainfall commonly triggers localised suspension announcements. Check your LGU channel.",
      source: "rain",
    },
  ],
  red: [
    {
      id: "rain-evacuate",
      urgency: "act-now",
      icon: "evacuate",
      title: "Evacuate low-lying areas now",
      detail:
        "Serious flooding is expected. Move to the designated evacuation centre before roads become impassable.",
      source: "rain",
    },
    {
      id: "rain-no-driving",
      urgency: "act-now",
      icon: "drive",
      title: "Do not drive through floodwater",
      detail:
        "Depth is unreadable once the road is submerged, and stalled vehicles block the evacuation route for everyone.",
      source: "rain",
    },
    {
      id: "rain-emergency",
      urgency: "act-now",
      icon: "phone",
      title: "Keep 911 and your barangay reachable",
      detail:
        "Save the barangay disaster office number offline. Cell data is the first service to degrade.",
      source: "rain",
    },
  ],
};

const URGENCY_RANK: Record<AdvisoryUrgency, number> = {
  "act-now": 0,
  prepare: 1,
  advice: 2,
};

/**
 * Advisories for the current conditions, most urgent first. The dominant
 * hazard's advice is listed ahead of the secondary hazard's at equal urgency,
 * so the list reads in the same order as the status band above it.
 */
export function buildAdvisories(heat: HeatBand, rain: RainBand): Advisory[] {
  const heatItems = HEAT_ADVISORIES[heat.level] ?? [];
  const rainItems = RAIN_ADVISORIES[rain.level] ?? [];
  const rainLeads = RAIN_SEVERITY[rain.level] > HEAT_SEVERITY[heat.level];

  const ordered = rainLeads ? [...rainItems, ...heatItems] : [...heatItems, ...rainItems];

  return ordered
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) => URGENCY_RANK[a.item.urgency] - URGENCY_RANK[b.item.urgency] || a.index - b.index,
    )
    .map(({ item }) => item);
}
