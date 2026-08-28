import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile one directory up would otherwise be picked as the workspace root.
  turbopack: { root: __dirname },

  /*
    Hosts allowed to request dev assets, for testing on a real device.

    Dev only — production ignores this entirely. Next blocks cross-origin
    requests to /_next resources by default so that a page on another origin
    cannot read your development bundles, which is why opening the app from a
    phone over the LAN fails with everything else configured correctly.

    This is the machine's own LAN address and will be wrong on any other
    network. `npm run dev` prints the current one as "Network:"; if the device
    shows an unstyled page with blocked-origin warnings in the terminal, this
    list is what needs updating.
  */
  allowedDevOrigins: ["192.168.1.247"],
};

export default nextConfig;
