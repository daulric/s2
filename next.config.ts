import type { NextConfig } from "next"
import bundleAnalyzer from "@next/bundle-analyzer"

const nextConfig: NextConfig = {

  cacheComponents: false,

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

}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig)