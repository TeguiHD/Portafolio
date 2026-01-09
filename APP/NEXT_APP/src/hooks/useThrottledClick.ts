"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Default cooldown in milliseconds between clicks
 */
const DEFAULT_COOLDOWN_MS = 300;

/**
 * Hook to throttle click events and prevent rapid clicking (autoclicker protection)
 * 
 * @param callback - The function to call on click
 * @param cooldownMs - Minimum time between clicks in milliseconds
 * @returns Object with throttled handler and isThrottled state
 * 
 * @example
 * const { handleClick, isThrottled } = useThrottledClick(() => doSomething(), 500);
 * <button onClick={handleClick} disabled={isThrottled}>Click</button>
 */
export function useThrottledClick<T extends (...args: unknown[]) => unknown>(
    callback: T,
    cooldownMs: number = DEFAULT_COOLDOWN_MS
): {
    handleClick: (...args: Parameters<T>) => void;
    isThrottled: boolean;
} {
    const [isThrottled, setIsThrottled] = useState(false);
    const lastClickRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickRef.current;

            if (timeSinceLastClick < cooldownMs) {
                // Still in cooldown, ignore click
                return;
            }

            // Update last click time
            lastClickRef.current = now;
            setIsThrottled(true);

            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set timeout to reset throttle state
            timeoutRef.current = setTimeout(() => {
                setIsThrottled(false);
            }, cooldownMs);

            // Execute the callback
            callback(...args);
        },
        [callback, cooldownMs]
    );

    return { handleClick, isThrottled };
}

/**
 * Hook to debounce rapid clicks - only executes after clicks stop
 * Useful for search inputs or auto-save
 * 
 * @param callback - The function to call after debounce
 * @param delayMs - Delay in milliseconds
 * @returns Debounced handler
 */
export function useDebouncedClick<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delayMs: number = DEFAULT_COOLDOWN_MS
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delayMs);
        },
        [callback, delayMs]
    );
}

/**
 * Higher-order function to wrap any click handler with throttle protection
 * Simpler alternative when you don't need the isThrottled state
 * 
 * @param handler - Original click handler
 * @param cooldownMs - Cooldown in milliseconds
 * @returns Throttled handler
 */
export function throttleClick<T extends (...args: unknown[]) => unknown>(
    handler: T,
    cooldownMs: number = DEFAULT_COOLDOWN_MS
): (...args: Parameters<T>) => void {
    let lastCall = 0;

    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall < cooldownMs) {
            return;
        }
        lastCall = now;
        handler(...args);
    };
}
