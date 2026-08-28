"use client";

import { Moon, Sun } from "@phosphor-icons/react";

/**
 * Follows the operating system until the reader overrides it, then remembers
 * the override. Both schemes are first-class: a dashboard gets opened at noon
 * in direct sun and at 2am during a storm.
 *
 * Which face shows is decided in CSS rather than in React state, and that is
 * the whole design of this control.
 *
 * State could not answer the question at the moment it is first asked. The
 * server has no scheme to render, so this button used to ship as the moon for
 * everybody and correct itself after hydration: a reader already in dark mode
 * watched the icon flip on every single page load. CSS knows the answer on the
 * first painted frame, from the same two signals the palette switches on.
 *
 * It also disposes of the missing prefers-color-scheme subscription rather than
 * adding one. An OS that turns dark at sunset restyles this button with no
 * listener, no re-render and no stale state, because the media query is the
 * subscription. A listener would have been a second, worse copy of it.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;

    /*
     * The applied attribute is the truth, not localStorage.
     *
     * The pre-paint bootstrap in the layout has already mirrored any stored
     * choice onto it, and this handler writes it directly, so it is correct
     * even when storage throws — which is the case that would otherwise leave
     * the button stuck, flipping between two values it could not read back.
     */
    const applied = root.dataset.theme;
    const dark =
      applied === "dark"
        ? true
        : applied === "light"
          ? false
          : window.matchMedia("(prefers-color-scheme: dark)").matches;

    const next = dark ? "light" : "dark";
    root.dataset.theme = next;

    try {
      localStorage.setItem("alerto-theme", next);
    } catch {
      // Private mode can refuse storage outright. The choice still applies for
      // this visit; only the memory of it is lost, which is the right way round.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="touch-target pressable hoverable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink"
    >
      {/*
        Both faces ship and CSS displays one. The name comes from whichever
        label survives, so it cannot disagree with the icon beside it: display:
        none takes the other out of the accessibility tree along with the pixels.
      */}
      <Sun size={16} className="when-dark" aria-hidden />
      <span className="when-dark sr-only">Switch to light theme</span>

      <Moon size={16} className="when-light" aria-hidden />
      <span className="when-light sr-only">Switch to dark theme</span>
    </button>
  );
}
