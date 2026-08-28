/**
 * Skeleton shaped like the real page, so the layout does not jump when the
 * readings land. The status band keeps its full height because it is the
 * tallest thing above the fold.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="h-16 bg-raised" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading readings">
          <div className="h-64 animate-pulse rounded-panel bg-sunken sm:h-56" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[26rem] animate-pulse rounded-panel bg-sunken" />
            <div className="h-[26rem] animate-pulse rounded-panel bg-sunken" />
          </div>
          <div className="h-40 animate-pulse rounded-panel bg-sunken" />
        </div>
      </main>
    </div>
  );
}
