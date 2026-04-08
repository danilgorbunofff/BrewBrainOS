import { createHash } from "node:crypto";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import withSerwistInit from "@serwist/next";

type ManifestEntryWithSize = {
  integrity?: string;
  revision?: string | null;
  size: number;
  url: string;
};

type ManifestTransformCompilation = {
  getAsset: (assetName: string) =>
    | {
        source: {
          source: () => string | Buffer | Uint8Array;
        };
      }
    | undefined;
};

const HASH_IN_URL_PATTERN = /[a-f0-9]{8,}/gi;

function hashContent(content: string | Buffer | Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}

function getRevisionFromUrl(url: string) {
  const matches = url.match(HASH_IN_URL_PATTERN);
  return matches?.at(-1)?.toLowerCase();
}

function getRevisionFromCompilation(url: string, compilation?: ManifestTransformCompilation) {
  if (!compilation || !url.startsWith("/_next/")) {
    return undefined;
  }

  const assetName = decodeURIComponent(url.replace(/^\/_next\//, ""));
  const asset = compilation.getAsset(assetName);

  if (!asset) {
    return undefined;
  }

  return hashContent(asset.source.source());
}

function normalizePrecacheManifest(
  manifestEntries: ManifestEntryWithSize[],
  compilation?: ManifestTransformCompilation,
) {
  const warnings: string[] = [];
  const manifest = manifestEntries.flatMap((entry) => {
    if (entry.revision) {
      return [{ ...entry, revision: entry.revision }];
    }

    const derivedRevision = getRevisionFromUrl(entry.url) ?? getRevisionFromCompilation(entry.url, compilation);

    if (!derivedRevision) {
      warnings.push(`Skipping precache entry without a stable revision: ${entry.url}`);
      return [];
    }

    return [{ ...entry, revision: derivedRevision }];
  });

  return { manifest, warnings };
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  register: false,
  reloadOnOnline: true,
  manifestTransforms: [
    async (manifestEntries, compilation) =>
      normalizePrecacheManifest(
        manifestEntries as ManifestEntryWithSize[],
        compilation as ManifestTransformCompilation | undefined,
      ),
  ],
  // Serwist requires webpack. The SW is compiled during `next build` (webpack).
  // In dev with turbopack the SW plugin is skipped, but that's fine —
  // offline testing should be done against a production build.
  disable: process.env.NODE_ENV !== "production",
});

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
  generateStatsFile: true,
} as Parameters<typeof bundleAnalyzer>[0] & {
  generateStatsFile: boolean;
});

const nextConfig: NextConfig = {
  // Turbopack is used for `next dev` (fast HMR).
  // `next build` uses webpack (where Serwist compiles the SW).
  turbopack: {},
  allowedDevOrigins: ['127.0.0.1'],
};

export default withBundleAnalyzer(withSerwist(nextConfig));
