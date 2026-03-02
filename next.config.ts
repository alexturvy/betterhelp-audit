import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/betterhelp",
  images: { unoptimized: true },
};

export default nextConfig;
