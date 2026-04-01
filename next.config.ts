import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  // Serwist requires webpack. The SW is compiled during `next build` (webpack).
  // In dev with turbopack the SW plugin is skipped, but that's fine —
  // offline testing should be done against a production build.
  disable: false,
});

const nextConfig: NextConfig = {
  // Turbopack is used for `next dev` (fast HMR).
  // `next build` uses webpack (where Serwist compiles the SW).
  turbopack: {},
};

export default withSerwist(nextConfig);
