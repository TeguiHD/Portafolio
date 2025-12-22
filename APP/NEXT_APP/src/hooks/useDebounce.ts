import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Returns a debounced value that only updates after the specified delay
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Returns a debounced callback that only executes after the specified delay
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callbackRef = useRef(callback);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const debouncedCallback = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delay);
        },
        [delay]
    ) as T;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}

/**
 * Hook for tracking tool usage with built-in debouncing and deduplication
 * - Tracks 'view' once per session (on mount)
 * - Tracks 'use'/'generate' with debounce to avoid spam
 * - Tracks 'download' immediately (explicit user action)
 */
export function useToolTracking(toolSlug: string, options: {
    trackViewOnMount?: boolean;
    debounceMs?: number;
} = {}) {
    const { trackViewOnMount = true, debounceMs = 2000 } = options;
    const hasTrackedView = useRef(false);
    const lastTrackedAction = useRef<string | null>(null);
    const pendingTrack = useRef<NodeJS.Timeout | null>(null);

    // Track view on mount (once per session)
    useEffect(() => {
        if (trackViewOnMount && !hasTrackedView.current) {
            hasTrackedView.current = true;
            fetch(`/api/tools/public/${toolSlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'view' }),
            }).catch(() => { });
        }
    }, [toolSlug, trackViewOnMount]);

    // Debounced track for frequent actions (generate, use, etc.)
    const trackDebounced = useCallback((action: string, metadata?: Record<string, unknown>) => {
        // Clear any pending track
        if (pendingTrack.current) {
            clearTimeout(pendingTrack.current);
        }

        // Skip if same action was just tracked
        if (lastTrackedAction.current === action) {
            return;
        }

        pendingTrack.current = setTimeout(() => {
            lastTrackedAction.current = action;
            fetch(`/api/tools/public/${toolSlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, metadata }),
            }).catch(() => { });

            // Reset last action after a while to allow re-tracking
            setTimeout(() => {
                lastTrackedAction.current = null;
            }, 5000);
        }, debounceMs);
    }, [toolSlug, debounceMs]);

    // Immediate track for explicit user actions (download, complete, etc.)
    const trackImmediate = useCallback((action: string, metadata?: Record<string, unknown>) => {
        fetch(`/api/tools/public/${toolSlug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, metadata }),
        }).catch(() => { });
    }, [toolSlug]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (pendingTrack.current) {
                clearTimeout(pendingTrack.current);
            }
        };
    }, []);

    return {
        trackDebounced,
        trackImmediate,
    };
}
