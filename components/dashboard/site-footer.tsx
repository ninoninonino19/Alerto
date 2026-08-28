/**
 * The band that closes the page.
 *
 * Colours come from footer tokens rather than literals. An earlier version
 * hardcoded the brand ink, which works against the sage page in light mode and
 * is exactly the page colour in dark mode, so the whole footer disappeared.
 *
 * The wording is the project's own and is set here verbatim. It is the one
 * statement on the page a reader might be relying on when they are least able
 * to weigh it, so it is not something to paraphrase for rhythm.
 *
 * Two things are done to it rather than to the words. "Disclaimer." is lifted
 * out of the muted run so the paragraph announces what it is before it is read,
 * and PAGASA — named twice, once for the thresholds and once for where
 * authority lives — carries its link on the second mention, the one that is
 * actually asking the reader to go somewhere.
 */
export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-footer-edge bg-footer text-footer-text">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <p className="display text-base text-footer-accent">Alerto</p>

        <p className="mt-3 max-w-[72ch] text-sm leading-5">
          <strong className="font-semibold text-footer-text">Disclaimer.</strong>{" "}
          <span className="text-footer-muted">
            Alerto is an informational tool and does not issue official warnings. Weather data is
            sourced from{" "}
            <a
              href="https://open-meteo.com"
              className="hoverable font-semibold text-footer-accent underline underline-offset-2"
              rel="noreferrer"
            >
              Open-Meteo
            </a>
            , and advisory classifications follow PAGASA&rsquo;s published thresholds. For official
            warnings and guidance, refer to{" "}
            <a
              href="https://www.pagasa.dost.gov.ph"
              className="hoverable font-semibold text-footer-accent underline underline-offset-2"
              rel="noreferrer"
            >
              PAGASA
            </a>{" "}
            or your local Disaster Risk Reduction and Management Office.
          </span>
        </p>
      </div>
    </footer>
  );
}
