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

export const metadata: Metadata = {
  title: "Alerto",
  description:
    "Live heat index and rainfall advisories for Philippine localities, classified against PAGASA thresholds.",
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
