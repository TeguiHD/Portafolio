"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ComponentProps, type MouseEvent } from "react";

interface ThrottledLinkProps extends ComponentProps<typeof Link> {
    /** Throttle delay in ms. Default: 300ms */
    throttle?: number;
}

const DEFAULT_THROTTLE_MS = 300;

/**
 * A Link component with built-in click throttling to prevent rapid navigation
 * Useful for navbar, footer, and other navigation links
 */
export function ThrottledLink({
    throttle = DEFAULT_THROTTLE_MS,
    onClick,
    children,
    ...props
}: ThrottledLinkProps) {
    const [isThrottled, setIsThrottled] = useState(false);
    const lastClickRef = useRef<number>(0);

    const handleClick = useCallback(
        (e: MouseEvent<HTMLAnchorElement>) => {
            const now = Date.now();

            if (now - lastClickRef.current < throttle) {
                // Still in cooldown, prevent navigation
                e.preventDefault();
                return;
            }

            lastClickRef.current = now;
            setIsThrottled(true);

            // Reset throttle state
            setTimeout(() => setIsThrottled(false), throttle);

            // Call original onClick if provided
            onClick?.(e);
        },
        [onClick, throttle]
    );

    return (
        <Link
            {...props}
            onClick={handleClick}
            aria-disabled={isThrottled}
            style={isThrottled ? { pointerEvents: "none", opacity: 0.7 } : undefined}
        >
            {children}
        </Link>
    );
}

/**
 * A generic throttled button wrapper for buttons that don't use the Button component
 */
interface ThrottledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Throttle delay in ms. Default: 300ms */
    throttle?: number;
}

export function ThrottledButton({
    throttle = DEFAULT_THROTTLE_MS,
    onClick,
    disabled,
    children,
    ...props
}: ThrottledButtonProps) {
    const [isThrottled, setIsThrottled] = useState(false);
    const lastClickRef = useRef<number>(0);

    const handleClick = useCallback(
        (e: MouseEvent<HTMLButtonElement>) => {
            if (!onClick || throttle === 0) {
                onClick?.(e);
                return;
            }

            const now = Date.now();
            if (now - lastClickRef.current < throttle) {
                e.preventDefault();
                return;
            }

            lastClickRef.current = now;
            setIsThrottled(true);

            setTimeout(() => setIsThrottled(false), throttle);

            onClick(e);
        },
        [onClick, throttle]
    );

    return (
        <button
            {...props}
            onClick={handleClick}
            disabled={disabled || isThrottled}
        >
            {children}
        </button>
    );
}
