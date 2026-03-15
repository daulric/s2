import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  cacheComponents: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "100mb"
    }
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: (process.env.NEXT_PUBLIC_SUPABASE_URL)?.split("https://")[1] || "daulric.dev",
        port: "",
        pathname: "/storage/v1/**"
      }
    ],
  },

};

export default nextConfig;
