import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { phrases } from "./data/phrases";

const staticRoutes = [
  "camera",
  "emergency",
  "hearing",
  "library",
  "settings",
];
const communicationRoutes = phrases.map(
  ({ id }) => `communication/${id}`,
);
const offlineRoutes = ["index", ...staticRoutes, ...communicationRoutes];
const offlineRevision = Date.now().toString(36);

const withPWA = withPWAInit({
  dest: "public",
  // Cache the static export so the app shell and assets work offline.
  cacheStartUrl: true,
  // The exported start page is static. Precaching it also avoids the broken
  // async runtime handler generated for a dynamic start URL.
  dynamicStartUrl: false,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // Disable the service worker in development to avoid stale caches.
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "1",
  workboxOptions: {
    disableDevLogs: true,
    // Next's static export emits one HTML document and one RSC payload per
    // route. Precache both so a route works before it has ever been visited.
    additionalManifestEntries: offlineRoutes.flatMap((route) => [
      { url: `/${route}.html`, revision: offlineRevision },
      { url: `/${route}.txt`, revision: offlineRevision },
    ]),
    // Next adds a changing _rsc cache-buster. The library's category query is
    // client-side state, so both parameters should resolve to the same payload.
    ignoreURLParametersMatching: [
      /^utm_/,
      /^fbclid$/,
      /^_rsc$/,
      /^category$/,
    ],
  },
});

const nextConfig: NextConfig = {
  // Fully static, installable PWA that runs offline without a Node server.
  output: "export",
  images: {
    // Static export cannot use the Next image optimization server.
    unoptimized: true,
  },
  reactStrictMode: true,
  // The webpack filesystem cache can stall static generation on some Node
  // versions. Keep the development cache enabled for fast rebuilds.
  webpack: (config, { dev }) => {
    if (!dev) config.cache = false;
    return config;
  },
};

export default withPWA(nextConfig);
