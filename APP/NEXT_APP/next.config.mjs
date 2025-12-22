/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment

  // Disable Turbopack for production builds to avoid stability issues
  // Turbopack is still experimental for production in Next.js 16
  experimental: {
    typedRoutes: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security headers
  poweredByHeader: false,
};

export default nextConfig;
