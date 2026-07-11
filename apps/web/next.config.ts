import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@santuario/shared", "@santuario/providers"],
};

export default nextConfig;
