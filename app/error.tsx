"use client";

import { ArrowClockwise } from "@phosphor-icons/react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="display text-4xl text-ink">Alerto could not load</h1>
      <p className="mt-4 max-w-[42ch] text-base leading-6 text-muted">
        Something failed while assembling the dashboard. No advisory level is being shown, which
        means none should be trusted from this screen right now.
      </p>
      <button
        type="button"
        onClick={reset}
        className="pressable mt-8 inline-flex items-center gap-2 rounded-panel bg-accent px-6 py-3 text-base font-semibold text-accent-ink"
      >
        <ArrowClockwise size={15} aria-hidden />
        Try again
      </button>
    </main>
  );
}
