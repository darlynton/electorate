import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ── Redirect non-www → www (301 permanent, so Twitter follows it) ───────
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'electorate.ng' }],
        destination: 'https://www.electorate.ng/:path*',
        permanent: true, // 301 instead of Vercel's default 307
      },
    ];
  },

  // ── Security & performance headers ────────────────────────────────────────
  async headers() {
    return [
      // Serve images with crawler-friendly headers (no X-Frame-Options, long cache)
      {
        source: '/:path*.(jpg|jpeg|png|gif|svg|webp)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
