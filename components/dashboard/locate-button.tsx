"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CrosshairSimple, Prohibit, Spinner } from "@phosphor-icons/react";
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

/*
  What a failure says, in the two ways it has to be said.

  Both strings are used twice: once in the notice a sighted reader sees, and
  once in the live region a screen reader hears. Keeping them in one place is
  what stops those two drifting apart.
*/
const MESSAGE: Record<"denied" | "unavailable", string> = {
  denied:
    "Location is blocked for this site. Allow it in your browser settings, then tap again — " +
    "or search for your locality instead.",
  unavailable: "This browser will not share your location. Search for your locality instead.",
};

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
   * Whether the explanation is on screen.
   *
   * Separate from `state` because the two have different lifetimes: being
   * blocked lasts until the reader changes a browser setting, while the notice
   * saying so is dismissed as soon as it has been read. The icon carries the
   * lasting half.
   */
  const [notice, setNotice] = useState(false);

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
        setNotice(viaPrompt);
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
          const blocked = error.code === error.PERMISSION_DENIED && viaPrompt;
          setState(blocked ? "denied" : "idle");
          setNotice(blocked);
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

  /*
   * The notice closes on the next touch anywhere.
   *
   * pointerdown rather than click, so it fires before the button's own handler:
   * tapping the button dismisses this and then reopens it as part of retrying,
   * which is the behaviour that reads as "try again" rather than "nothing
   * happened".
   */
  useEffect(() => {
    if (!notice) return;
    function dismiss() {
      setNotice(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [notice]);

  const busy = state === "locating" || navigating;
  const failed = state === "denied" || state === "unavailable";
  const label =
    state === "denied"
      ? "Location blocked"
      : state === "unavailable"
        ? "Location unavailable"
        : busy
          ? "Finding your location"
          : "Use my location";

  return (
    <>
      <button
        type="button"
        onClick={() => locate(true)}
        /*
          Disabled only while a lookup is in flight. It used to be disabled for
          "unavailable" too, which left a dead control on a phone with nothing
          to explain it: the label that would have said so is hidden below the
          sm breakpoint, and the title that would have said so needs a pointer
          to hover.
        */
        disabled={busy}
        aria-label={label}
        /*
          justify-center matters here and nowhere else in this row. On a coarse
          pointer .touch-target sets a 44px floor, the content is 35px, and
          without this the spare nine pixels all land on one side and the icon
          sits visibly off centre.
        */
        className="touch-target pressable hoverable flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-control bg-surface px-2.5 text-sm font-semibold text-ink disabled:text-faint sm:px-3"
      >
        {busy ? (
          <Spinner size={15} className="animate-spin" aria-hidden />
        ) : failed ? (
          /* The state that outlives the notice. A slashed circle says blocked
             without needing the words there is no room for. */
          <Prohibit size={15} aria-hidden />
        ) : (
          <CrosshairSimple size={15} aria-hidden />
        )}
        <span className="hidden sm:inline">
          {state === "denied" ? "Blocked" : busy ? "Locating" : "My location"}
        </span>
      </button>

      {/*
        Pinned under the header rather than anchored to the button.

        At 375px the header has no spare width at all, and a popover hung off a
        control that sits 86px from the left edge would run off the screen. This
        is positioned against the viewport instead, so it fits at every width and
        needs no arithmetic.
      */}
      <div
        data-open={notice && failed}
        className="pop fixed inset-x-4 top-[4.5rem] z-30 mx-auto max-w-sm rounded-card bg-raised p-4 shadow-xl shadow-black/10 ring-1 ring-line"
      >
        <p className="text-sm leading-5 text-muted">{failed ? MESSAGE[state] : ""}</p>
      </div>

      {/*
        The same words, for a reader who cannot see the notice. Always mounted
        and outside the box above, because a live region inside something that
        is display: none announces nothing when it appears.
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {failed ? MESSAGE[state] : ""}
      </span>
    </>
  );
}
