/**
 * Security Headers Manager
 * 
 * Applies standard security headers to harden the application against
 * common web vulnerabilities.
 * 
 * References:
 * - OWASP Secure Headers Project
 * - NIST SP 800-53 (System and Communications Protection)
 * 
 * @module security/middleware/headers
 */

export const SECURITY_HEADERS = {
    // HSTS: Force HTTPS for 1 year, include subdomains, allow preload
    // Mitigates: Man-in-the-Middle (MITM), Protocol Downgrade Attacks
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // X-Frame-Options: Deny embedding
    // Mitigates: Clickjacking
    'X-Frame-Options': 'DENY',

    // X-Content-Type-Options: Disable MIME sniffing
    // Mitigates: Drive-by Downloads, MIME Confusion Attacks
    'X-Content-Type-Options': 'nosniff',

    // Referrer-Policy: Privacy protection
    // Mitigates: Information Leaking via Referer Header
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions-Policy: Disable sensitive browser features
    // Mitigates: Privacy invasion, Hardware abuse
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',

    // X-DNS-Prefetch-Control: Privacy for DNS
    'X-DNS-Prefetch-Control': 'on'
} as const;

export function applySecurityHeaders(headers: Headers): void {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
    });
}
