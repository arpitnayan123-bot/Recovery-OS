import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: `output: "standalone"` was removed — it is only useful for
  // self-hosting/Docker. Vercel builds Next.js natively and ignores/mishandles it.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
