import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile one directory up would otherwise be picked as the workspace root.
  turbopack: { root: __dirname },
};

export default nextConfig;
