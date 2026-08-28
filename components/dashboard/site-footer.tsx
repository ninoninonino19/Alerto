/**
 * The band that closes the page.
 *
 * Colours come from footer tokens rather than literals. An earlier version
 * hardcoded the brand ink, which works against the sage page in light mode and
 * is exactly the page colour in dark mode, so the whole footer disappeared.
 *
 * Kept deliberately short. The one line that is not trimmed is the disclaimer:
 * a reference tool that people might act on has to say plainly that it is not
 * the official warning.
 */
export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-footer-edge bg-footer text-footer-text">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <p className="display text-base text-footer-accent">Alerto</p>

        <dl className="mt-4 grid gap-x-8 gap-y-4 text-sm leading-5 sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-footer-text">Data</dt>
            <dd className="mt-1 text-footer-muted">
              <a
                href="https://open-meteo.com"
                className="hoverable font-semibold text-footer-accent underline underline-offset-2"
                rel="noreferrer"
              >
                Open-Meteo
              </a>
              , refreshed every ten minutes.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-footer-text">Method</dt>
            <dd className="mt-1 text-footer-muted">
              Heat index computed here with the Rothfusz regression.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-footer-text">Thresholds</dt>
            <dd className="mt-1 text-footer-muted">
              PAGASA classifications. Not a replacement for an official warning from PAGASA or your
              local disaster office.
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
