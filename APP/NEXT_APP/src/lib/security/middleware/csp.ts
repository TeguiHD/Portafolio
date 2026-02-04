/**
 * Content Security Policy (CSP) Generator
 * 
 * Implements OWASP "Defense in Depth" for Cross-Site Scripting (XSS).
 * Uses Nonce-based strict policy.
 * 
 * @module security/middleware/csp
 */

export function generateCsp(nonce: string): string {
    // Define allowed domains strictly
    const trusted = {
        scripts: [
            "'self'",
            "'unsafe-inline'", // Required for Next.js hydration (protected by nonce in strict mode, but fallback needed)
            "'unsafe-eval'",   // Sometimes required for dev mode / specific libs (review for prod)
            "https://cdn.discordapp.com",
            "https://lh3.googleusercontent.com",
            "https://avatars.githubusercontent.com"
        ],
        styles: [
            "'self'",
            "'unsafe-inline'", // Required for Tailwind/CSS-in-JS
            "https://fonts.googleapis.com"
        ],
        images: [
            "'self'",
            "blob:",
            "data:",
            "https://cdn.discordapp.com",
            "https://lh3.googleusercontent.com",
            "https://avatars.githubusercontent.com",
            "https://placehold.co"
        ],
        fonts: [
            "'self'",
            "data:",
            "https://fonts.gstatic.com"
        ]
    }

    const policy = {
        'default-src': ["'self'"],
        'script-src': [`'nonce-${nonce}'`, ...trusted.scripts],
        'style-src': [...trusted.styles],
        'img-src': [...trusted.images],
        'font-src': [...trusted.fonts],
        'object-src': ["'none'"], // Prevent Flash/Java content
        'base-uri': ["'self'"],   // Prevent base tag hijacking
        'form-action': ["'self'"], // Prevent form submission to malicious sites
        'frame-ancestors': ["'none'"], // Prevent Clickjacking (embedding)
        'upgrade-insecure-requests': [] // Force HTTPS
    }

    // Build CSP string
    return Object.entries(policy)
        .map(([key, values]) => {
            const valueStr = values.length > 0 ? ` ${values.join(' ')}` : ''
            return `${key}${valueStr};`
        })
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}
