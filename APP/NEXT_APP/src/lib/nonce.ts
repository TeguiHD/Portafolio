/**
 * Nonce utilities for CSP (Content Security Policy)
 * 
 * In nonce-based CSP, inline scripts and styles are blocked UNLESS
 * they have a matching nonce attribute. This prevents XSS attacks.
 * 
 * Usage in Server Components:
 *   import { getNonce } from '@/lib/nonce'
 *   const nonce = getNonce()
 *   <Script nonce={nonce} ... />
 *   <style nonce={nonce}>...</style>
 * 
 * @see https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 */
import { headers } from 'next/headers'
import { cache } from 'react'

/**
 * Get the CSP nonce for the current request.
 * 
 * IMPORTANT: This only works in Server Components and Server Actions.
 * The nonce is set by the proxy.ts middleware and passed via x-nonce header.
 * 
 * Uses React cache() to deduplicate calls within the same request.
 * 
 * @returns The nonce string for inline scripts/styles
 */
export const getNonce = cache(async (): Promise<string> => {
    const headersList = await headers()
    const nonce = headersList.get('x-nonce') || ''
    return nonce
})

/**
 * Synchronous version - only use when you've already awaited headers
 * In most cases, use getNonce() instead
 */
export function getNonceSync(headersList: Headers): string {
    return headersList.get('x-nonce') || ''
}
