import Link from "next/link";
import type { Place } from "@/lib/open-meteo";
import { LocateButton } from "./locate-button";
import { LocationSwitcher } from "./location-switcher";
import { ThemeToggle } from "./theme-toggle";

/**
 * White nav on the sage canvas. The surface change is the only separation
 * needed, so there is no border under it.
 *
 * There is no button back to the default place. The wordmark already links to
 * the root, which is where the default lives, and a control that appeared and
 * disappeared depending on the current place was one thing too many in a row
 * that has to stay on a single line at 375px.
 */
export function SiteHeader({ place, isDefault }: { place: Place; isDefault: boolean }) {
  return (
    <header className="sticky top-0 z-20 bg-raised">
      {/* Everything here stays on one 64px row. */}
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="hoverable display shrink-0 text-xl text-ink">
          Alerto
        </Link>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          {/* isDefault still matters here: it gates the silent location lookup
              so a chosen place is never overridden on load. */}
          <LocateButton isDefault={isDefault} />
          <LocationSwitcher current={place} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
