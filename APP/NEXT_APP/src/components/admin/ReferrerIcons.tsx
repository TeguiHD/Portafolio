"use client";

import React from "react";

// Map referrer domains to icons
const referrerIconMap: Record<string, React.ReactNode> = {
    google: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    ),
    linkedin: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
    ),
    facebook: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    ),
    twitter: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    ),
    github: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
    ),
    instagram: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
            <defs>
                <radialGradient id="instagram-gradient" r="150%" cx="30%" cy="107%">
                    <stop stopColor="#fdf497" offset="0" />
                    <stop stopColor="#fdf497" offset="0.05" />
                    <stop stopColor="#fd5949" offset="0.45" />
                    <stop stopColor="#d6249f" offset="0.6" />
                    <stop stopColor="#285AEB" offset="0.9" />
                </radialGradient>
            </defs>
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
        </svg>
    ),
    youtube: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    ),
    direct: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    ),
    internal: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
    default: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    ),
};

// Extract domain from URL
function extractDomain(url: string): string {
    if (!url || url === "Directo") return "direct";
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        // Check if it's internal (localhost or same site)
        if (hostname === "localhost" || hostname.includes("127.0.0.1") || hostname.includes("nicoholas.dev")) {
            return "internal";
        }
        return hostname.replace(/^www\./, "");
    } catch {
        return url.toLowerCase();
    }
}

// Get the path from internal referrer URL
function getInternalPath(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname || "/";
    } catch {
        return "/";
    }
}

// Path to friendly name mapping for internal navigation
const internalPathNames: Record<string, string> = {
    "/": "Inicio",
    "/tools": "Herramientas",
    "/tools/qr-generator": "Generador QR",
    "/tools/base64-converter": "Base64",
    "/tools/unit-converter": "Unidades",
    "/tools/regex-tester": "Regex",
    "/admin": "Dashboard",
    "/login": "Login",
};

function getInternalDisplayName(url: string): string {
    const path = getInternalPath(url);
    // Check exact match
    if (internalPathNames[path]) return `Desde: ${internalPathNames[path]}`;
    // Check prefix matches
    if (path.startsWith("/tools/")) {
        const toolName = path.replace("/tools/", "").replace(/-/g, " ");
        return `Desde: ${toolName.charAt(0).toUpperCase() + toolName.slice(1)}`;
    }
    if (path.startsWith("/admin/")) {
        return `Desde: Admin`;
    }
    return `Navegación interna`;
}

// Get clean display name for referrer
export function getReferrerDisplayName(url: string): string {
    if (!url || url === "Directo") return "Tráfico Directo";

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Internal navigation
        if (hostname === "localhost" || hostname.includes("127.0.0.1") || hostname.includes("nicoholas.dev")) {
            return getInternalDisplayName(url);
        }

        // External referrers - show clean domain
        const cleanHost = hostname.replace(/^www\./, "");

        // Friendly names for known sources
        if (cleanHost.includes("google")) return "Google";
        if (cleanHost.includes("linkedin")) return "LinkedIn";
        if (cleanHost.includes("facebook") || cleanHost.includes("fb.")) return "Facebook";
        if (cleanHost.includes("twitter") || cleanHost === "t.co" || cleanHost.includes("x.com")) return "X (Twitter)";
        if (cleanHost.includes("github")) return "GitHub";
        if (cleanHost.includes("instagram")) return "Instagram";
        if (cleanHost.includes("youtube") || cleanHost.includes("youtu.be")) return "YouTube";

        return cleanHost;
    } catch {
        return url;
    }
}

// Match domain to known referrers
function matchReferrer(domain: string): keyof typeof referrerIconMap {
    if (!domain || domain === "direct") return "direct";
    if (domain === "internal") return "internal";

    const domainLower = domain.toLowerCase();

    if (domainLower.includes("google")) return "google";
    if (domainLower.includes("linkedin")) return "linkedin";
    if (domainLower.includes("facebook") || domainLower.includes("fb.")) return "facebook";
    if (domainLower.includes("twitter") || domainLower.includes("x.com") || domainLower === "t.co") return "twitter";
    if (domainLower.includes("github")) return "github";
    if (domainLower.includes("instagram")) return "instagram";
    if (domainLower.includes("youtube") || domainLower.includes("youtu.be")) return "youtube";

    return "default";
}

interface ReferrerIconProps {
    source: string | null;
    className?: string;
}

export function ReferrerIcon({ source, className = "" }: ReferrerIconProps) {
    const domain = extractDomain(source || "Directo");
    const referrerKey = matchReferrer(domain);
    const icon = referrerIconMap[referrerKey];

    return (
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white ${className}`}>
            {icon}
        </div>
    );
}

export default ReferrerIcon;
