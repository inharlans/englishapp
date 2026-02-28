import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingIncludes: {
    "/api/clipper/extension": ["./extension/**/*"]
  }
};

export default nextConfig;
