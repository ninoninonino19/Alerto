import type { Advisory } from "../advisories";

/**
 * Advice shown under the readings.
 *
 * `source` is not decoration. A reader, and anyone debugging this later, needs
 * to know whether they are looking at text a model produced or at the fixed
 * PAGASA rules, because only the second is guaranteed to be there when the
 * network is not.
 */
export type AdviceResult = {
  items: Advisory[];
  source: "generated" | "rules";
};

/** The fields a model is allowed to fill in. Everything else is set here. */
export type ModelItem = {
  title: string;
  detail: string;
  urgency: Advisory["urgency"];
  icon: Advisory["icon"];
};

export const URGENCIES: Array<Advisory["urgency"]> = ["act-now", "prepare", "advice"];

export const ICONS: Array<Advisory["icon"]> = [
  "school",
  "work",
  "health",
  "water",
  "evacuate",
  "drive",
  "phone",
];

/**
 * Caps that keep a talkative model from breaking the layout.
 *
 * The detail cap is deliberately wide enough for two sentences. At the previous
 * 200 characters the model could name an action but never explain how to carry
 * it out, which is most of what makes advice useful.
 */
export const MAX_ITEMS = 6;
export const MAX_TITLE = 60;
export const MAX_DETAIL = 320;
