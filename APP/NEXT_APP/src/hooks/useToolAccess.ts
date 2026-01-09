"use client";

import { useEffect, useState, useCallback } from "react";

export type ToolAccessType = "public" | "admin_only" | "private" | "loading" | "error" | "blocked";

interface ToolAccessResult {
    isAuthorized: boolean;
    isLoading: boolean;
    accessType: ToolAccessType;
    toolName?: string;
    retryAccess: () => void;
}

// Security: Minimum delay before showing tool content (prevents timing attacks)
const MIN_SECURITY_DELAY_MS = 100;

// Security: Max retries before permanent block
const MAX_RETRIES = 3;

export function useToolAccess(slug: string): ToolAccessResult {
    // SECURITY: Default to NOT authorized - fail-closed approach
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [accessType, setAccessType] = useState<ToolAccessType>("loading");
    const [toolName, setToolName] = useState<string | undefined>();
    const [retryCount, setRetryCount] = useState(0);

    const checkAccess = useCallback(async () => {
        // SECURITY: Too many retries = permanent block
        if (retryCount >= MAX_RETRIES) {
            setAccessType("blocked");
            setIsAuthorized(false);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const startTime = Date.now();

        try {
            // SECURITY: Add cache-busting to prevent cached bypass
            const res = await fetch(`/api/tools/public/${slug}?_t=${Date.now()}`, {
                credentials: "include",
                cache: "no-store",
                headers: {
                    "X-Requested-With": "XMLHttpRequest", // CSRF protection hint
                },
            });

            // SECURITY: Ensure minimum delay to prevent timing attacks
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_SECURITY_DELAY_MS) {
                await new Promise(r => setTimeout(r, MIN_SECURITY_DELAY_MS - elapsed));
            }

            if (res.status === 401) {
                // Unauthorized - requires admin login
                setAccessType("admin_only");
                setIsAuthorized(false);
                setIsLoading(false);
                return;
            }

            if (res.status === 410) {
                // Gone - tool is disabled/private
                setAccessType("private");
                setIsAuthorized(false);
                setIsLoading(false);
                return;
            }

            if (res.status === 403) {
                // Forbidden - explicitly blocked
                setAccessType("blocked");
                setIsAuthorized(false);
                setIsLoading(false);
                return;
            }

            if (!res.ok) {
                // SECURITY: Any non-OK response = block access
                setAccessType("error");
                setIsAuthorized(false);
                setIsLoading(false);
                return;
            }

            // Validate response structure
            const data = await res.json();

            // SECURITY: Validate the response has expected structure
            if (!data || typeof data !== "object") {
                setAccessType("error");
                setIsAuthorized(false);
                setIsLoading(false);
                return;
            }

            // SECURITY: Check for explicit allowed flag
            if (data.allowed === true || (data.tool && data.tool.isActive !== false)) {
                setToolName(data.tool?.name);
                setAccessType("public");
                setIsAuthorized(true);
            } else {
                // Not explicitly allowed = block
                setAccessType("blocked");
                setIsAuthorized(false);
            }
        } catch (error) {
            console.error("Security check failed:", error);
            // SECURITY CRITICAL: On ANY error, block access (fail-closed)
            setAccessType("error");
            setIsAuthorized(false);
            setRetryCount(prev => prev + 1);
        } finally {
            setIsLoading(false);
        }
    }, [slug, retryCount]);

    useEffect(() => {
        checkAccess();
    }, [checkAccess]);

    const retryAccess = useCallback(() => {
        if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            checkAccess();
        }
    }, [retryCount, checkAccess]);

    return { isAuthorized, isLoading, accessType, toolName, retryAccess };
}

