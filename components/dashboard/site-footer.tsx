/**
 * The band that closes the page.
 *
 * Colours come from footer tokens rather than literals. An earlier version
 * hardcoded the brand ink, which works against the sage page in light mode and
 * is exactly the page colour in dark mode, so the whole footer disappeared.
 *
 * The disclaimer used to sit third in a row of three columns, in muted text, at
 * the same weight as the name of the weather API. It is the most consequential
 * sentence on the page — a reference tool people might act on has to say
 * plainly that it is not the official warning — so it now leads, and it says
 * where the official warning actually is. Telling somebody this is unofficial
 * without telling them where to go is only half an answer.
 */
export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-footer-edge bg-footer text-footer-text">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="display text-base text-footer-accent">Alerto</p>

        <p className="mt-4 max-w-[64ch] text-sm leading-5">
          <strong className="font-semibold text-footer-text">
            This is not an official warning.
          </strong>{" "}
          <span className="text-footer-muted">
            Alerto classifies live readings against PAGASA&rsquo;s published thresholds. For
            warnings and bulletins that carry authority, go to{" "}
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

        <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm leading-5 sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-footer-text">Readings</dt>
            <dd className="mt-1 text-footer-muted">
              <a
                href="https://open-meteo.com"
                className="hoverable font-semibold text-footer-accent underline underline-offset-2"
                rel="noreferrer"
              >
                Open-Meteo
              </a>
              , refreshed every ten minutes. No reading is shown when the service cannot be reached.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-footer-text">Method</dt>
            <dd className="mt-1 text-footer-muted">
              Heat index computed here from temperature and humidity with the Rothfusz regression,
              rather than read from a forecast field. Rainfall is classified on PAGASA&rsquo;s
              hourly and three-hour bands.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-footer-text">Source</dt>
            <dd className="mt-1 text-footer-muted">
              Open, MIT licensed, and{" "}
              <a
                href="https://github.com/ninoninonino19/Alerto"
                className="hoverable font-semibold text-footer-accent underline underline-offset-2"
                rel="noreferrer"
              >
                readable on GitHub
              </a>
              . The thresholds and the maths can be checked.
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
