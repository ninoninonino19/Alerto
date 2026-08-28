/**
 * The band that closes the page.
 *
 * Colours come from footer tokens rather than literals. An earlier version
 * hardcoded the brand ink, which works against the sage page in light mode and
 * is exactly the page colour in dark mode, so the whole footer disappeared.
 *
 * Three facts and nothing else: this is not the official warning, the readings
 * are Open-Meteo's, the classifications are PAGASA's. What was here to explain
 * the method — the regression, the refresh interval, the licence — was all true
 * and none of it was what anybody reads a footer for. The one sentence that
 * changes what a reader does is the first one, and a shorter footer is the only
 * way to be sure it is the one they read.
 *
 * PAGASA is named twice on purpose: once as the source of the bands, once as
 * where authority actually lives, and it is the second that carries the link.
 * Saying this is unofficial without saying where official is would be half an
 * answer, and during a storm it is the half that matters.
 */
export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-footer-edge bg-footer text-footer-text">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <p className="display text-base text-footer-accent">Alerto</p>

        <p className="mt-3 max-w-[68ch] text-sm leading-5">
          <strong className="font-semibold text-footer-text">
            This is not an official warning.
          </strong>{" "}
          <span className="text-footer-muted">
            Readings come from{" "}
            <a
              href="https://open-meteo.com"
              className="hoverable font-semibold text-footer-accent underline underline-offset-2"
              rel="noreferrer"
            >
              Open-Meteo
            </a>
            , and the advisory classifications are PAGASA&rsquo;s. For a warning that carries
            authority, go to{" "}
            <a
              href="https://www.pagasa.dost.gov.ph"
              className="hoverable font-semibold text-footer-accent underline underline-offset-2"
              rel="noreferrer"
            >
              PAGASA
            </a>{" "}
            or your local disaster risk reduction and management office.
          </span>
        </p>
      </div>
    </footer>
  );
}
