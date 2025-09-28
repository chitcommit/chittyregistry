/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure for Cloudflare Pages deployment
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  // Disable server-side features for static export
  experimental: {
    // Enable edge runtime for API routes if needed
    runtime: 'edge',
  },

  // Environment variables for client-side
  env: {
    CHITTY_SCHEMA_URL: process.env.CHITTY_SCHEMA_URL || 'https://schema.chitty.cc/api',
    CHITTY_ID_URL: process.env.CHITTY_ID_URL || 'https://id.chitty.cc',
  },

  // Custom webpack config for edge compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Browser-specific configurations
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirects for clean URLs
  async redirects() {
    return [
      {
        source: '/schema',
        destination: '/',
        permanent: true,
      },
      {
        source: '/generate',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;