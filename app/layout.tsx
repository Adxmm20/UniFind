import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
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
        <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
      </body>
    </html>
  );
}
