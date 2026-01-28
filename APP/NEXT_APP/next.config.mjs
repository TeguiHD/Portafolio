/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  typedRoutes: true, // Moved from experimental in Next.js 16

  images: {
    // SECURITY: Restrict image sources to trusted domains only
    // Prevents SSRF and loading malicious external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      // Add other trusted domains as needed
    ],
  },

  // Security headers
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // HSTS - Force HTTPS for 1 year (incluye subdominios)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection (legacy, pero no hace daño)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:* https://cdn.jsdelivr.net https://assets.calendly.com https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' http://localhost:* https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' http://localhost:* https://api.frankfurter.app https://openrouter.ai https://api.calendly.com https://cloudflareinsights.com",
              "frame-src 'self' https://calendly.com",
              "media-src 'self' data: blob: http://localhost:*",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // 301 Redirects for old URLs (SEO + backward compatibility)
  async redirects() {
    return [
      // Main tools section
      { source: '/tools', destination: '/herramientas', permanent: true },
      { source: '/tools/:slug*', destination: '/herramientas/:slug*', permanent: true },
      // Old tool slugs to new Spanish slugs
      { source: '/herramientas/qr-generator', destination: '/herramientas/qr', permanent: true },
      { source: '/herramientas/password-generator', destination: '/herramientas/claves', permanent: true },
      { source: '/herramientas/unit-converter', destination: '/herramientas/unidades', permanent: true },
      { source: '/herramientas/regex-tester', destination: '/herramientas/regex', permanent: true },
      { source: '/herramientas/ascii-art', destination: '/herramientas/ascii', permanent: true },
      { source: '/herramientas/image-base64', destination: '/herramientas/base64', permanent: true },
      { source: '/herramientas/binary-translator', destination: '/herramientas/binario', permanent: true },
      { source: '/herramientas/link-generator', destination: '/herramientas/enlaces', permanent: true },
      { source: '/herramientas/random-picker', destination: '/herramientas/aleatorio', permanent: true },
      { source: '/herramientas/tax-calculator', destination: '/herramientas/impuestos', permanent: true },
      // Auth pages
      { source: '/login', destination: '/acceso', permanent: true },
      // Legal pages
      { source: '/privacy', destination: '/privacidad', permanent: true },
      { source: '/terms', destination: '/terminos', permanent: true },
    ];
  },
};

export default nextConfig;

