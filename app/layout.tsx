import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import ScrollWallpaper from "./components/ScrollWallpaper";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ height: "100%", WebkitFontSmoothing: "antialiased" }}
    >
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <ScrollWallpaper />
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
