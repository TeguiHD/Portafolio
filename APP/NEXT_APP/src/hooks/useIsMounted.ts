"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the component has mounted on the client.
 * Useful for preventing SSR hydration mismatch with animations.
 * 
 * Usage:
 * const isMounted = useIsMounted();
 * <motion.div initial={isMounted ? { opacity: 0 } : false} animate={{ opacity: 1 }} />
 */
export function useIsMounted(): boolean {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return isMounted;
}

/**
 * Helper to create SSR-safe initial values for framer-motion.
 * Returns the initial value only after client hydration.
 */
export function useSafeInitial<T>(initial: T): T | false {
    const isMounted = useIsMounted();
    return isMounted ? initial : false;
}
