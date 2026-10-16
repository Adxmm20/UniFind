import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ship the seed SQLite database with the standalone build so server reads work.
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Posting attaches a picture, and the default 1 MB server-action body limit
    // would reject anything but a thumbnail before app/actions/posts.ts runs.
    // The limit counts multipart overhead too (10-20 KB for a file this size),
    // so 6 MB leaves room over the 5 MB cap lib/posts.ts enforces in code.
    serverActions: { bodySizeLimit: "6mb" },
    // This app blocks on purpose: every page reads the session cookie so the
    // first paint knows guest vs signed-in (see `instant = false` in
    // app/layout.tsx), which means no route here can be instant-navigable. The
    // default 'warning' level still validates every page segment implicitly, so
    // /[username]'s `await params` (and the cookie reads on / and /bookmarks)
    // report URL-data / runtime-data insights even though blocking is the
    // deliberate design. 'manual-warning' validates only segments that opt in
    // with `export const instant = true`, so a genuinely instant route added
    // later turns its own validation back on.
    instantInsights: { validationLevel: "manual-warning" },
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
