import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // SECURITY: ESLint errors will block production builds
    // Only ignore in development if absolutely necessary
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    // SECURITY: TypeScript errors will block production builds
    // Only ignore in development if absolutely necessary
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://api.paystack.co https://api.ultramsg.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com",
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
  // Experimental features
  experimental: {},
  // Server-side configuration
  serverExternalPackages: [],
};

export default nextConfig;
