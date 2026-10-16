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
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
