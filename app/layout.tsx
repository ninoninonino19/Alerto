import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

/*
  The brand runs two faces on purpose: a heavy proprietary display sans for the
  brand moment, and Inter for everything else. Wise Sans is not licensable, and
  collapsing both roles into Inter would lose the contrast that is the whole
  typographic story, so Manrope at 800 stands in for the display face. It is the
  substitute the design system itself names first.
*/
const display = Manrope({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

/*
  The title is a template because every page is a place.

  It used to be the literal string "Alerto" for all of them, so a link shared to
  somebody in Lucban arrived saying nothing about Lucban. The per-place half is
  filled in by generateMetadata in app/page.tsx; this supplies the suffix and the
  fallback for anything that does not set one.

  The description says what the thresholds are and, in the same breath, that this
  is not the official warning. That sentence has to survive being read out of
  context, because a search result or a shared card is exactly that.
*/
export const metadata: Metadata = {
  title: {
    default: "Alerto — heat and rainfall advisories for the Philippines",
    template: "%s · Alerto",
  },
  description:
    "Live heat index and rainfall for any Philippine locality, classified against PAGASA's " +
    "advisory thresholds. Not a replacement for an official warning.",
  applicationName: "Alerto",
  openGraph: {
    title: "Alerto — heat and rainfall advisories for the Philippines",
    description:
      "Live heat index and rainfall for any Philippine locality, classified against PAGASA's " +
      "advisory thresholds. Not a replacement for an official warning.",
    type: "website",
    locale: "en_PH",
    siteName: "Alerto",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ebe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f0c" },
  ],
};

/**
 * Applies a stored theme override before first paint. Without this the page
 * renders in the system scheme and then snaps, which on a dark-adapted phone
 * at night is a flash of light in somebody's face.
 */
const THEME_BOOTSTRAP = `
try {
  var t = localStorage.getItem("alerto-theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The bootstrap script below sets data-theme before React hydrates, so the
    // server HTML and the live DOM legitimately differ on this one element.
    <html
      lang="en-PH"
      className={`${display.variable} ${body.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
