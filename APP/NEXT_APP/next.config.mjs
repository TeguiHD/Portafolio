/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  // typedRoutes disabled: Turbopack does not generate proper AppRoutes/PageRoutes
  // (StaticRoutes only contains redirect routes, causing false type errors)
  // Re-enable when Turbopack fully supports typed route generation
  // typedRoutes: true,
  compiler: {
    // Remove debug logs from production bundles (client/server transpiled output)
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['warn', 'error'] }
      : false,
  },

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
          // HSTS - Force HTTPS for 2 years (matches proxy.ts - HSTS preload requirement)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
          // Content Security Policy is now set dynamically by middleware.ts
          // with per-request nonces for improved security (no unsafe-inline)
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
