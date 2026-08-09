import type { NextConfig } from "next";
import { createRequire } from "node:module";

type RuntimeCachingEntry = {
  handler: string;
  method?: string;
  options?: Record<string, unknown>;
  urlPattern: RegExp | ((params: { request: Request; url: URL }) => boolean);
};

type PwaPluginOptions = {
  dest: string;
  disable: boolean;
  register: boolean;
  runtimeCaching: RuntimeCachingEntry[];
  skipWaiting: boolean;
};

type WithPwaFactory = (options: PwaPluginOptions) => (config: NextConfig) => NextConfig;

const require = createRequire(import.meta.url);
const withPWA = require("next-pwa") as WithPwaFactory;
const defaultRuntimeCaching = require("next-pwa/cache") as RuntimeCachingEntry[];

const offlinePageCache: RuntimeCachingEntry = {
  urlPattern: ({ request, url }) => request.mode === "navigate" && (url.pathname === "/" || url.pathname === "/coach"),
  handler: "NetworkFirst",
  options: {
    cacheName: "chessfork-offline-pages",
    expiration: {
      maxAgeSeconds: 7 * 24 * 60 * 60,
      maxEntries: 8,
    },
    networkTimeoutSeconds: 3,
  },
};

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.chesscomfiles.com",
      },
      {
        protocol: "https",
        hostname: "www.chess.com",
      },
    ],
  },
  experimental: {
    authInterrupts: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, "stockfish"];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  runtimeCaching: [offlinePageCache, ...defaultRuntimeCaching],
  skipWaiting: true,
})(nextConfig);
