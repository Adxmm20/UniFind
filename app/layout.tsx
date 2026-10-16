import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import AccessibilityProvider from "./components/a11y/AccessibilityProvider";
import ScrollWallpaper from "./components/ScrollWallpaper";
import { PREFS_COOKIE, parsePrefs, prefsAttributes } from "@/lib/prefs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniFind",
  description: "University discovery and comparison platform.",
  openGraph: {
    title: "UniFind",
    description: "University discovery and comparison platform.",
  },
};

// Every page's header reads the session cookie to decide between guest and
// signed-in states, which cannot be baked into a prerendered shell. This opts
// the whole app into blocking dynamic rendering instead of streaming, and
// covers app/not-found.tsx too (a special file that cannot declare its own
// segment config).
export const instant = false;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The accessibility preferences are read here, on the server, and written onto
  // <html> as data-* attributes — so the theme, the colour filter and the rest
  // are right in the very first frame, with nothing to apply in an effect and no
  // mismatch for React to reconcile. The provider below only keeps the DOM and
  // the cookie in step once the visitor starts toggling.
  const cookieStore = await cookies();
  const prefs = parsePrefs(cookieStore.get(PREFS_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ height: "100%", WebkitFontSmoothing: "antialiased" }}
      {...prefsAttributes(prefs)}
    >
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* First in the body so it is the first thing Tab reaches. */}
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <AppRouterCacheProvider>
          <AccessibilityProvider prefs={prefs}>
            <ScrollWallpaper />
            {/* The page's own content, in one element: it is what the colour
                filter is applied to (see globals.css). */}
            <div className="page-shell">{children}</div>
          </AccessibilityProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
