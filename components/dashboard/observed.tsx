import type { CSSProperties } from "react";
import type { Snapshot } from "@/lib/open-meteo";

/**
 * The raw inputs, last and smallest.
 *
 * These are the numbers the two indices are computed from. Somebody checking
 * the dashboard's working needs them; nobody deciding whether to hold class
 * does, so they get hairlines and negative space rather than four more cards.
 */
export function Observed({ snapshot, step }: { snapshot: Snapshot; step: number }) {
  const items = [
    { term: "Air temperature", value: snapshot.temperatureC.toFixed(1), unit: "\u00b0C" },
    { term: "Relative humidity", value: Math.round(snapshot.humidity).toString(), unit: "%" },
    { term: "Wind speed", value: snapshot.windKph.toFixed(0), unit: " km/h" },
    { term: "Rain, past 3 h", value: snapshot.threeHourAccumulation.toFixed(1), unit: " mm" },
  ];

  return (
    <section
      style={{ "--step": step } as CSSProperties}
      aria-labelledby="observed-heading"
      className="enter rounded-panel bg-raised p-5 sm:p-8"
    >
      <h2 id="observed-heading" className="text-base font-bold text-ink">
        Measured inputs
      </h2>
      <dl className="mt-6 grid grid-cols-2 gap-y-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
        {items.map((item, index) => (
          <div key={item.term} className={index > 0 ? "sm:pl-6" : ""}>
            <dt className="text-sm text-muted">{item.term}</dt>
            <dd className="tabular display mt-2 text-3xl text-ink">
              {item.value}
              <span className="text-lg font-bold text-muted">{item.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
