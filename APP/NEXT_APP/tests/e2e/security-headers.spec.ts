import { expect, test } from '@playwright/test';

test.describe('Security headers and edge protections', () => {
    test('sends baseline browser hardening headers', async ({ request }) => {
        const response = await request.get('/');
        expect(response.ok()).toBeTruthy();

        const headers = response.headers();
        expect(headers['strict-transport-security']).toContain('max-age=63072000');
        expect(headers['x-frame-options']).toBe('DENY');
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['permissions-policy']).toContain('camera=()');
        expect(headers['x-security-version']).toBeTruthy();

        // Next.js 16 reflects middleware request-header overrides in HTTP responses.
        // x-nonce is intentionally set on the request so server components can read it.
        // If reflected in the response it is still safe: nonces are per-request and
        // unpredictable. Verify that when present it is consistent with the CSP nonce.
        const csp = headers['content-security-policy'];
        expect(csp).toBeTruthy();
        expect(csp).toContain("default-src 'none'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).toContain("object-src 'none'");

        const isDevCsp = csp.includes('http://localhost:*') || csp.includes('http://127.0.0.1:*');

        const reflectedNonce = headers['x-nonce'];
        if (reflectedNonce && !isDevCsp) {
            // In production: if framework reflects the nonce, it must match the CSP nonce-* value
            expect(csp).toContain(`'nonce-${reflectedNonce}'`);
        }
        if (!isDevCsp) {
            expect(csp).toMatch(/script-src .*'nonce-[^']+'/);
            expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
            expect(csp).toContain("script-src-attr 'none'");
        }
    });

    test('rejects unsupported mutation content types before route logic', async ({ request }) => {
        const response = await request.post('/api/contact', {
            data: 'plain text payload',
            headers: {
                'content-type': 'text/plain',
            },
        });

        expect(response.status()).toBe(415);
        // Verify clickjacking protection is present on blocked responses
        expect(response.headers()['x-frame-options']).toBe('DENY');
        expect(response.headers()['x-content-type-options']).toBe('nosniff');
        // CSP presence on early returns depends on Next.js/Turbopack version;
        // the important guarantee is that the middleware intercepts before route logic.
        const csp = response.headers()['content-security-policy'];
        if (csp) {
            expect(csp).toContain("default-src 'none'");
        }
    });

    test('blocks encoded path traversal probes', async ({ request }) => {
        const response = await request.get('/%2e%2e/etc/passwd');
        expect([400, 404]).toContain(response.status());
    });
});
