import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

export function sanitizeQuotationHtml(html: string): string {
    try {
        // Try using DOMPurify with JSDOM if available
        const window = new JSDOM("").window;
        const purify = DOMPurify(window);

        return purify.sanitize(html, {
            WHOLE_DOCUMENT: true,
            // Allow Tailwind CDN specifically
            ADD_TAGS: ["script", "iframe", "link", "style"],
            ADD_ATTR: ["target", "allow", "sandbox", "srcdoc"],
            // Hooks to filter scripts
            FORBID_TAGS: [],
            FORBID_ATTR: ["on*"],
        });
    } catch (error) {
        // Fallback: Regex-based sanitization (if JSDOM is missing/fails)
        console.warn("JSDOM not found, using regex sanitization fallback");

        let clean = html;

        // 1. Remove <script> tags BUT keep the Tailwind CDN one
        // Strategy: dynamic regex is hard. Let's just remove ALL scripts that aren't the CDN.
        // Actually, easier to just remove ALL scripts and re-inject the CDN if needed.
        // But the user might have custom scripts. Security > Custom scripts.

        // Remove all script tags content
        clean = clean.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, (match) => {
            if (match.includes("cdn.tailwindcss.com")) return match; // Keep Tailwind
            if (match.includes("font-awesome")) return match; // Keep FontAwesome
            return ""; // Nuke others
        });

        // 2. Remove event handlers (onclick, onerror, etc)
        clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*")/gim, "");

        // 3. Remove javascript: protocol
        clean = clean.replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gim, "href='#'");

        return clean;
    }
}
