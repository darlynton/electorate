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
  // NOTE: Restrictive headers (X-Frame-Options, Permissions-Policy, etc.) are
  // applied via middleware instead, so they only apply to HTML pages — NOT to
  // images/assets. Twitter's image fetcher rejects images with X-Frame-Options: DENY.
  async headers() {
    return [
      // Images: crawler-friendly, long cache, CORS
      {
        source: '/:path*.(jpg|jpeg|png|gif|svg|webp)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      // API og-image: crawler-friendly
      {
        source: '/api/v1/og-image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      // Generated opengraph-image routes: crawler-friendly, no security headers
      {
        source: '/:path*/opengraph-image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      // API og-photo proxy: crawler-friendly
      {
        source: '/api/v1/og-photo',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      // Global: only the headers that are safe for ALL resources (including images)
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
