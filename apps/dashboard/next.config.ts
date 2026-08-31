import path from "node:path";
import type { NextConfig } from "next";

const journalSrc = path.resolve(__dirname, "../journal/src");
const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@workspace/trading-engine"],
  turbopack: {
    resolveAlias: {
      "@": journalSrc,
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": journalSrc,
    };
    return config;
  },
};

export default nextConfig;
