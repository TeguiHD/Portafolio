const DEFAULT_REDIRECT_ALLOWLIST = [
    "/",
    "/admin",
    "/acceso",
    "/cotizacion",
    "/herramientas",
];

const LOCAL_ORIGIN = "http://localhost";

function normalizeAllowlistPath(path: string): string | null {
    const trimmed = path.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return null;
    }

    const normalized = trimmed.replace(/\/+$/, "");
    return normalized === "" ? "/" : normalized;
}

function resolveRedirectAllowlist(): string[] {
    const envEntries = (process.env.REDIRECT_ALLOWLIST ?? "")
        .split(",")
        .map((entry) => normalizeAllowlistPath(entry))
        .filter((entry): entry is string => Boolean(entry));

    const merged = [...DEFAULT_REDIRECT_ALLOWLIST, ...envEntries];
    return Array.from(new Set(merged));
}

const REDIRECT_ALLOWLIST = resolveRedirectAllowlist();

function isAllowedPath(pathname: string): boolean {
    return REDIRECT_ALLOWLIST.some((allowedPath) => {
        if (allowedPath === "/") {
            return pathname === "/";
        }

        return pathname === allowedPath || pathname.startsWith(`${allowedPath}/`);
    });
}

function normalizeInternalPath(path: string): string | null {
    try {
        const parsed = new URL(path, LOCAL_ORIGIN);
        if (parsed.origin !== LOCAL_ORIGIN) {
            return null;
        }

        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
}

export function sanitizeRedirectPath(rawPath: string | null | undefined, fallback = "/admin"): string {
    if (!rawPath) {
        return fallback;
    }

    const candidate = rawPath.trim();
    if (
        candidate.length === 0 ||
        candidate.length > 2048 ||
        candidate.startsWith("//") ||
        candidate.includes("://") ||
        /[\r\n]/.test(candidate) ||
        !candidate.startsWith("/")
    ) {
        return fallback;
    }

    const normalized = normalizeInternalPath(candidate);
    if (!normalized) {
        return fallback;
    }

    const pathname = normalized.split(/[?#]/, 1)[0] || "/";
    if (!isAllowedPath(pathname)) {
        return fallback;
    }

    return normalized;
}

export function sanitizeAuthRedirect(url: string, baseUrl: string, fallback = "/admin"): string {
    try {
        const candidate = new URL(url, baseUrl);
        const base = new URL(baseUrl);

        if (candidate.origin !== base.origin) {
            return new URL(fallback, base).toString();
        }

        const safePath = sanitizeRedirectPath(
            `${candidate.pathname}${candidate.search}${candidate.hash}`,
            fallback
        );

        return new URL(safePath, base).toString();
    } catch {
        return new URL(fallback, baseUrl).toString();
    }
}
