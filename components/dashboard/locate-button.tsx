"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CrosshairSimple, Spinner } from "@phosphor-icons/react";
import { placeHref } from "@/lib/place-url";
import { describeCoordinates } from "@/lib/reverse-geocode";

type State = "idle" | "locating" | "denied" | "unavailable";

/**
 * Coordinates are rounded before they go anywhere.
 *
 * Two decimal places is a little over a kilometre, which is finer than the
 * forecast grid this feeds and far coarser than the reading a phone hands over.
 * The value ends up in the URL, where it can be shared, pasted, and logged, and
 * it is also what gets sent to the naming service, so there is no reason for it
 * to carry somebody's street.
 */
const PRECISION = 2;

/**
 * Asks the browser where the reader is, and only when that is reasonable.
 *
 * A permission prompt fired on page load is the thing everyone dismisses on
 * reflex, and browsers increasingly punish sites for it. So the prompt is
 * attached to a button, and the automatic path is reserved for the case where
 * permission has already been granted: on a return visit the reading is simply
 * local, with nothing asked and nothing tapped.
 *
 * Even then it only runs when no place has been chosen. Someone who searched
 * for Tacloban should not be dragged home by a background lookup.
 */
export function LocateButton({ isDefault }: { isDefault: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  /*
   * The navigation owns the tail of the spinner.
   *
   * The first version set "locating" and pushed the new URL without ever
   * clearing it. The header survives a change of search params, so the state
   * survived with it and the button read "Locating" for the rest of the visit.
   * useTransition ties that to the navigation itself, which ends on its own.
   */
  const [navigating, startNavigation] = useTransition();
  const attempted = useRef(false);

  const locate = useCallback(
    (viaPrompt: boolean) => {
      if (!("geolocation" in navigator)) {
        setState("unavailable");
        return;
      }
      setState("locating");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = Number(position.coords.latitude.toFixed(PRECISION));
          const longitude = Number(position.coords.longitude.toFixed(PRECISION));

          // A name makes the reading recognisable; failing to get one is not a
          // reason to withhold it, so the coordinates stand in.
          const named = await describeCoordinates(latitude, longitude);
          const place = named ?? {
            name: "Your location",
            admin: `${latitude.toFixed(PRECISION)}, ${longitude.toFixed(PRECISION)}`,
            latitude,
            longitude,
          };

          setState("idle");
          startNavigation(() => router.push(placeHref(place)));
        },
        (error) => {
          // A refusal on the silent path is not worth reporting: nothing was
          // asked for, so there is nothing for the reader to have refused.
          setState(error.code === error.PERMISSION_DENIED && viaPrompt ? "denied" : "idle");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    },
    [router],
  );

  useEffect(() => {
    if (attempted.current || !isDefault) return;
    attempted.current = true;

    // Permissions is the whole point of the silent path: it distinguishes
    // "already allowed" from "never asked", which getCurrentPosition cannot.
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted") locate(false);
      })
      .catch(() => {
        // Safari has been late to this. No permission info means no silent path.
      });
  }, [isDefault, locate]);

  const busy = state === "locating" || navigating;
  const label =
    state === "denied"
      ? "Location blocked"
      : state === "unavailable"
        ? "Location unavailable"
        : busy
          ? "Finding your location"
          : "Use my location";

  return (
    <button
      type="button"
      onClick={() => locate(true)}
      disabled={busy || state === "unavailable"}
      title={
        state === "denied"
          ? "Location is blocked for this site. Allow it in your browser settings, then try again."
          : label
      }
      aria-label={label}
      className="touch-target pressable hoverable flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-surface px-2.5 text-sm font-semibold text-ink disabled:text-faint sm:px-3"
    >
      {busy ? (
        <Spinner size={15} className="animate-spin" aria-hidden />
      ) : (
        <CrosshairSimple size={15} aria-hidden />
      )}
      <span className="hidden sm:inline">
        {state === "denied" ? "Blocked" : busy ? "Locating" : "My location"}
      </span>
    </button>
  );
}
