"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, MapPin, X } from "@phosphor-icons/react";
import type { Place } from "@/lib/open-meteo";
import type { PlaceMatch } from "@/lib/geocode";
import { placeHref } from "@/lib/place-url";

type Status = "idle" | "loading" | "ready" | "empty" | "error";

/**
 * Place switcher for the dashboard.
 *
 * The label is visually hidden rather than absent: the magnifying glass and the
 * placement in the header carry the meaning for sighted users, while assistive
 * technology still gets a real name for the control.
 */
export function LocationSwitcher({ current }: { current: Place }) {
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const optionId = useId();
  const groupLabelId = useId();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceMatch[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  // Which input moved the highlight last. Decides whether the row's colour
  // change animates; see .result-row[data-instant] in globals.css.
  const [keyboardNav, setKeyboardNav] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      /*
        Invalidating the cached matches, not deriving state from props: below two
        characters there is nothing to look up, and the previous term's results
        must not survive into the next one.
      */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("idle");
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    // 300ms rather than a keystroke-per-request. Typing "Sampaloc, Manila"
    // costs one lookup instead of sixteen.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("lookup-failed");
        const data = (await response.json()) as { matches: PlaceMatch[] };
        setResults(data.matches);
        setHighlighted(0);
        setStatus(data.matches.length === 0 ? "empty" : "ready");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        // Dropped as well as flagged, so a failed lookup cannot leave the
        // previous query's matches sitting behind the error copy.
        setResults([]);
        setStatus("error");
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  /*
    The query clears when the new place lands, not when the result is clicked.

    Clearing on click emptied the list while it was still fading out, which is
    why this component used to keep a ref snapshot of the last open contents and
    read it during render. React does not support that: a render can be thrown
    away, and a ref written during one that never commits holds a value the UI
    never showed. Waiting for the place to change removes the need for it — the
    exit runs on live state, because that state is still true until navigation
    completes.
  */
  const placeKey = `${current.latitude},${current.longitude}`;
  const [settledPlace, setSettledPlace] = useState(placeKey);
  if (settledPlace !== placeKey) {
    setSettledPlace(placeKey);
    setQuery("");
  }

  function choose(match: PlaceMatch) {
    setOpen(false);

    /*
      Picking the place already on screen is the one case the reset above cannot
      catch: the URL does not change, so `current` never changes, and the query
      would sit in the field for the rest of the visit. Clearing here is safe
      precisely because nothing is navigating — there is no exit to blank.
    */
    if (`${match.place.latitude},${match.place.longitude}` === placeKey) setQuery("");

    router.push(placeHref(match.place));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (status !== "ready") return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setKeyboardNav(true);
      setHighlighted((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setKeyboardNav(true);
      setHighlighted((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[highlighted]);
    }
  }

  const listOpen = open && status !== "idle";

  /*
    A refetch keeps the list it is about to replace rather than falling back to
    the skeleton. The skeleton is for the first lookup of a session only: wiping
    a good list to grey bars every time the typing pauses changed the popover's
    height twice per keystroke, which is the jump this avoids.
  */
  const refreshing = status === "loading" && results.length > 0;

  const showResults = status === "ready" || refreshing;

  /*
    Exact matches and broader ones are rendered as two runs rather than one list
    with a heading spliced into the middle.

    A listbox may only contain options and groups, so the heading cannot be a
    sibling of the options: it becomes the group's accessible name instead, via
    aria-labelledby. Assistive technology then announces "Nearest covered area"
    as the group a broader match belongs to, which is the same thing the visible
    heading tells a sighted reader.

    The split point is the flat index of the first broader match, so the indices
    handed to renderOption still address results and still line up with
    `highlighted`.
  */
  const broaderStart = results.findIndex((match) => match.broader);
  const exact = broaderStart === -1 ? results : results.slice(0, broaderStart);
  const broader = broaderStart === -1 ? [] : results.slice(broaderStart);

  /*
    Announcements for the states that are otherwise only visible.

    Outside the popover and always mounted, because a live region inside an
    element that is display: none announces nothing, and the popover is exactly
    that whenever the list is closed. It goes quiet the moment the list closes,
    so a closing box does not re-announce what it is still fading out.
  */
  const announcement = !listOpen
    ? ""
    : status === "loading"
      ? "Searching"
      : status === "ready"
        ? `${results.length} ${results.length === 1 ? "place" : "places"} found`
        : status === "empty"
          ? "No places found"
          : status === "error"
            ? "Place lookup unavailable"
            : "";

  function renderOption(match: PlaceMatch, index: number) {
    return (
      <button
        key={`${match.place.latitude},${match.place.longitude}`}
        type="button"
        id={`${optionId}-${index}`}
        role="option"
        aria-selected={index === highlighted}
        /*
          Out of the tab order. Focus stays in the input for the whole
          interaction and the active option is named by aria-activedescendant,
          so a tab stop on every result would be a trap the pattern does not
          expect: Tab is meant to leave the control, not walk the list.
        */
        tabIndex={-1}
        data-instant={keyboardNav}
        onMouseEnter={() => {
          setKeyboardNav(false);
          setHighlighted(index);
        }}
        onClick={() => choose(match)}
        className={[
          "result-row pressable flex w-full items-start gap-3 px-4 py-3 text-left",
          index === highlighted ? "bg-accent-soft" : "",
        ].join(" ")}
      >
        <MapPin size={15} className="mt-0.5 shrink-0 text-faint" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{match.place.name}</span>
          <span className="block truncate text-xs text-muted">
            {match.place.admin}
            {match.context ? ` · ${match.context}` : ""}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
      <label htmlFor={inputId} className="sr-only">
        Search for a place in the Philippines
      </label>

      <div className="field flex items-center gap-2 rounded-control border border-ink bg-raised px-3">
        <MagnifyingGlass size={16} className="field-icon shrink-0 text-faint" aria-hidden />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          /*
            The arrow keys move a highlight while focus stays in the input, so
            without this a screen reader is told only that the value changed and
            never which result is now active.
          */
          aria-activedescendant={
            listOpen && showResults && results.length > 0 ? `${optionId}-${highlighted}` : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          /*
            The name without the province.

            At 375px this input is 80px wide, and "Manila, Metro Manila" needs
            138. The province was the half that got cut, so the placeholder
            spent its space saying nothing and then stopped mid-word. The name
            alone fits with room, and the province is not lost: the status band
            renders the full "name, admin" directly above the verdict, which is
            where somebody checks what they are looking at anyway.
          */
          placeholder={current.name}
          className="h-10 w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-muted"
        />
        {/*
          Always mounted, so the input is the same width before and after the
          first character. It used to be inserted on keystroke one, which shifted
          the caret and the text the user was part-way through typing.
        */}
        <button
          type="button"
          disabled={query.length === 0}
          data-visible={query.length > 0}
          onClick={() => {
            setQuery("");
            setStatus("idle");
          }}
          className="clear-affordance pressable hoverable shrink-0 rounded-full p-2 text-faint"
        >
          <X size={14} aria-hidden />
          <span className="sr-only">Clear search</span>
        </button>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      <div
        data-open={listOpen}
        data-refreshing={refreshing}
        className="pop absolute z-30 mt-2 max-h-[60vh] w-full overflow-y-auto overflow-x-hidden rounded-card bg-raised shadow-xl shadow-black/10 ring-1 ring-line"
      >
        {/* Placeholder bars, so hidden rather than announced as three blank options. */}
        {status === "loading" && !refreshing && (
          <div aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 px-4 py-3">
                <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-sunken" />
                <span
                  className="h-3 animate-pulse rounded-full bg-sunken"
                  style={{ width: `${58 - row * 12}%` }}
                />
              </div>
            ))}
          </div>
        )}

        <div id={listId} role="listbox" aria-label="Place results">
          {showResults && exact.map((match, index) => renderOption(match, index))}

          {showResults && broader.length > 0 && (
            <div role="group" aria-labelledby={groupLabelId}>
              <p
                id={groupLabelId}
                className="result-group-label bg-surface px-4 py-2 text-xs font-semibold text-muted"
              >
                No exact match. Nearest covered area:
              </p>
              {broader.map((match, index) => renderOption(match, exact.length + index))}
            </div>
          )}
        </div>

        {/* Outside the listbox: neither is an option, and the region above announces them. */}
        {status === "empty" && (
          <p className="px-4 py-4 text-sm leading-5 text-muted">
            No Philippine place matches {`"${query.trim()}"`}. Try the municipality or city rather
            than the barangay.
          </p>
        )}

        {status === "error" && (
          <p className="px-4 py-4 text-sm leading-5 text-muted">
            Place lookup is unavailable right now. The readings above are unaffected.
          </p>
        )}
      </div>
    </div>
  );
}
