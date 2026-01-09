"use client";

import { forwardRef, type ButtonHTMLAttributes, useCallback, useRef, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Throttle delay in ms. Set to 0 to disable. Default: 300ms */
  throttle?: number;
  /** Show loading state */
  loading?: boolean;
}

const DEFAULT_THROTTLE_MS = 300;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = "primary",
    size = "md",
    throttle = DEFAULT_THROTTLE_MS,
    loading = false,
    onClick,
    disabled,
    children,
    ...props
  }, ref) => {
    const [isThrottled, setIsThrottled] = useState(false);
    const lastClickRef = useRef<number>(0);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!onClick || throttle === 0) {
          onClick?.(e);
          return;
        }

        const now = Date.now();
        if (now - lastClickRef.current < throttle) {
          // Still in cooldown, prevent click
          e.preventDefault();
          return;
        }

        lastClickRef.current = now;
        setIsThrottled(true);

        // Reset throttle state after cooldown
        setTimeout(() => setIsThrottled(false), throttle);

        onClick(e);
      },
      [onClick, throttle]
    );

    const variants: Record<Variant, string> = {
      primary:
        "bg-accent-1 text-white hover:bg-opacity-90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200",
      secondary:
        "bg-accent-2 text-white hover:bg-opacity-90 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
      outline:
        "border-2 border-accent-1 text-accent-1 hover:bg-accent-1 hover:text-white transition-all duration-200",
      ghost:
        "text-neutral-dark dark:text-neutral-light hover:bg-neutral-200 dark:hover:bg-gray-800 transition-all duration-200",
      danger:
        "bg-red-500 text-white hover:bg-red-600 shadow-lg transition-all duration-200",
    };

    const sizes: Record<Size, string> = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg font-semibold",
      icon: "p-2",
    };

    const isDisabled = disabled || loading || isThrottled;

    return (
      <button
        ref={ref}
        className={cn(
          "rounded-full font-medium active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          loading && "cursor-wait",
          className
        )}
        onClick={handleClick}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, cn };
