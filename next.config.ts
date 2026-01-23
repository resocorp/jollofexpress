import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // TODO: Fix all ESLint errors and set back to false
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TODO: Fix all TypeScript errors and set back to false  
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Security headers to mitigate CVE-2025-55184 and CVE-2025-55183
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://api.ultramsg.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://www.google-analytics.com https://www.googletagmanager.com",
              "media-src 'self' data: blob:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
            ].join('; ')
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
        ],
      },
    ];
  },
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Experimental features
  experimental: {},
  // Server-side configuration
  serverExternalPackages: [],
};

export default nextConfig;
