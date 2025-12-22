"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useToolAccess(slug: string) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await fetch(`/api/tools/public/${slug}`);
                
                if (res.status === 401) {
                    // Unauthorized (Private tool, not logged in)
                    const currentPath = `/tools/${slug}`;
                    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
                    return;
                }

                if (res.status === 410) {
                    // Gone (Disabled tool)
                    router.push("/tools");
                    return;
                }

                if (res.ok) {
                    setIsAuthorized(true);
                }
            } catch (error) {
                console.error("Error checking tool access:", error);
                // On error, we might want to allow access or block it. 
                // For now, let's allow it to avoid blocking users on network glitches,
                // but in a strict environment we might block.
                setIsAuthorized(true); 
            } finally {
                setIsLoading(false);
            }
        };

        checkAccess();
    }, [slug, router]);

    return { isAuthorized, isLoading };
}
