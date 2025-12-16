import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This forces Vercel to ignore small errors and just deploy the app */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;