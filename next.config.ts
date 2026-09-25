import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Il Portale squadre (public/portale/) usa percorsi relativi (css/, js/):
  // va servito come /portale/ con la barra finale, che Next toglierebbe
  // (il passaggio da /portale a /portale/ lo fa proxy.ts).
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return {
      beforeFiles: [{ source: '/portale/', destination: '/portale/index.html' }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
