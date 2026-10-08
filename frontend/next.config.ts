import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
  async rewrites() {
    return [{ source: "/projects/:path*", destination: "/" }];
  },
};
export default nextConfig;
