import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The floating Next badge in the corner. It only ever appears in
  // development, but the dashboard is shown to providers during setup and a
  // framework logo sitting on their screen is noise they cannot explain.
  devIndicators: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // The product was called Prestataire and lived at /prestataire. The page
  // moved with the name; the address stays answerable, because it is in
  // Google's index, in the sitemap we published and in whatever messages have
  // already been sent carrying it.
  async redirects() {
    return [
      { source: "/prestataire", destination: "/beautyprest", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Payment proofs are private: never cache them in shared caches.
        source: "/api/proofs/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
