/**
 * Quotation HTML Sanitizer
 * 
 * Security layer for user-uploaded HTML content in quotations.
 * Allows: Trusted CDNs (Tailwind, Google Fonts, Font Awesome), basic scripts for layout
 * Blocks: Cookie access, eval, Function constructor, obfuscation patterns, external data exfiltration
 */

// Trusted CDN domains whitelist
const TRUSTED_SCRIPT_DOMAINS = [
    'cdn.tailwindcss.com',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'cdn.jsdelivr.net'
];

const TRUSTED_STYLE_DOMAINS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'cdn.tailwindcss.com'
];

// Dangerous patterns to neutralize (regex)
const DANGEROUS_PATTERNS: { pattern: RegExp; replacement: string; description: string }[] = [
    // Cookie access
    { pattern: /document\.cookie/gi, replacement: '/* [BLOCKED: cookie access] */', description: 'Cookie theft attempt' },
    { pattern: /localStorage/gi, replacement: '/* [BLOCKED: localStorage] */', description: 'localStorage access' },
    { pattern: /sessionStorage/gi, replacement: '/* [BLOCKED: sessionStorage] */', description: 'sessionStorage access' },

    // Dynamic code execution
    { pattern: /\beval\s*\(/gi, replacement: '/* [BLOCKED: eval] */ (', description: 'eval() execution' },
    { pattern: /new\s+Function\s*\(/gi, replacement: '/* [BLOCKED: Function] */ (', description: 'Function constructor' },
    { pattern: /setTimeout\s*\(\s*['"`]/gi, replacement: '/* [BLOCKED: setTimeout string] */ (', description: 'setTimeout with string' },
    { pattern: /setInterval\s*\(\s*['"`]/gi, replacement: '/* [BLOCKED: setInterval string] */ (', description: 'setInterval with string' },

    // Data exfiltration
    { pattern: /fetch\s*\(/gi, replacement: '/* [BLOCKED: fetch] */ (', description: 'fetch() network request' },
    { pattern: /XMLHttpRequest/gi, replacement: '/* [BLOCKED: XHR] */', description: 'XMLHttpRequest' },
    { pattern: /navigator\.sendBeacon/gi, replacement: '/* [BLOCKED: beacon] */', description: 'sendBeacon exfiltration' },
    { pattern: /\.src\s*=\s*['"`]https?:\/\/(?!cdn\.|cdnjs\.|fonts\.|unpkg\.)/gi, replacement: '.src = "/* [BLOCKED: external src] */', description: 'Dynamic external src' },

    // Frame busting / navigation
    { pattern: /top\.location/gi, replacement: '/* [BLOCKED: top.location] */', description: 'Frame busting' },
    { pattern: /parent\.location/gi, replacement: '/* [BLOCKED: parent.location] */', description: 'Parent navigation' },
    { pattern: /window\.location\s*=/gi, replacement: '/* [BLOCKED: redirect] */ = ', description: 'Redirect attempt' },

    // Obfuscation detection
    { pattern: /\\x[0-9a-fA-F]{2}/g, replacement: '/* [BLOCKED: hex escape] */', description: 'Hex obfuscation' },
    { pattern: /\\u[0-9a-fA-F]{4}/g, replacement: '/* [BLOCKED: unicode escape] */', description: 'Unicode obfuscation' },
    { pattern: /atob\s*\(/gi, replacement: '/* [BLOCKED: atob] */ (', description: 'Base64 decode (obfuscation)' },
    { pattern: /btoa\s*\(/gi, replacement: '/* [BLOCKED: btoa] */ (', description: 'Base64 encode' },
    { pattern: /fromCharCode/gi, replacement: '/* [BLOCKED: fromCharCode] */', description: 'Character code obfuscation' },

    // Event hijacking
    { pattern: /on(error|load|click|mouse|key|focus|blur|submit|change)\s*=/gi, replacement: 'data-blocked-$1=', description: 'Inline event handler' },

    // WebSocket / Workers
    { pattern: /new\s+WebSocket/gi, replacement: '/* [BLOCKED: WebSocket] */', description: 'WebSocket connection' },
    { pattern: /new\s+Worker/gi, replacement: '/* [BLOCKED: Worker] */', description: 'Web Worker' },
    { pattern: /importScripts/gi, replacement: '/* [BLOCKED: importScripts] */', description: 'Worker script import' },
];

// Script tag analysis  
function isScriptAllowed(scriptTag: string): boolean {
    // Check if it's from a trusted CDN
    const srcMatch = scriptTag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch) {
        const src = srcMatch[1];
        return TRUSTED_SCRIPT_DOMAINS.some(domain => src.includes(domain));
    }

    // Inline scripts - check content for dangerous patterns
    const scriptContent = scriptTag.replace(/<script[^>]*>|<\/script>/gi, '');

    // Allow Tailwind config objects
    if (scriptContent.includes('tailwind.config')) return true;

    // Block if contains dangerous patterns
    for (const { pattern } of DANGEROUS_PATTERNS) {
        if (pattern.test(scriptContent)) {
            return false;
        }
    }

    // Allow simple print/layout scripts
    if (scriptContent.length < 500) return true;

    // Block large inline scripts by default (likely obfuscated)
    return false;
}

export function sanitizeQuotationHTML(html: string): { sanitized: string; warnings: string[] } {
    const warnings: string[] = [];
    let sanitized = html;

    // Process script tags
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
        if (isScriptAllowed(match)) {
            // Still apply pattern sanitization to allowed scripts
            let cleanScript = match;
            for (const { pattern, replacement } of DANGEROUS_PATTERNS) {
                cleanScript = cleanScript.replace(pattern, replacement);
            }
            return cleanScript;
        } else {
            warnings.push(`Blocked potentially unsafe script tag`);
            return `<!-- [SECURITY: Script removed for safety] -->`;
        }
    });

    // Apply pattern sanitization to entire document
    for (const { pattern, replacement, description } of DANGEROUS_PATTERNS) {
        const matches = sanitized.match(pattern);
        if (matches && matches.length > 0) {
            warnings.push(`Neutralized: ${description} (${matches.length} instance${matches.length > 1 ? 's' : ''})`);
            sanitized = sanitized.replace(pattern, replacement);
        }
    }

    // Verify style links are from trusted sources
    sanitized = sanitized.replace(/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, href) => {
        const isTrusted = TRUSTED_STYLE_DOMAINS.some(domain => href.includes(domain)) || href.startsWith('data:');
        if (!isTrusted && href.startsWith('http')) {
            warnings.push(`Blocked external stylesheet: ${href.substring(0, 50)}...`);
            return `<!-- [SECURITY: External stylesheet blocked] -->`;
        }
        return match;
    });

    return { sanitized, warnings };
}

// Export for testing
export { DANGEROUS_PATTERNS, TRUSTED_SCRIPT_DOMAINS, TRUSTED_STYLE_DOMAINS };
