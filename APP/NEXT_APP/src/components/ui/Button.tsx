import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<Variant, string> = {
      primary:
        "bg-accent-1 text-white hover:bg-opacity-90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200",
      secondary:
        "bg-accent-2 text-white hover:bg-opacity-90 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
      outline:
        "border-2 border-accent-1 text-accent-1 hover:bg-accent-1 hover:text-white transition-all duration-200",
      ghost:
        "text-neutral-dark dark:text-neutral-light hover:bg-neutral-200 dark:hover:bg-gray-800 transition-all duration-200",
    };

    const sizes: Record<Size, string> = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg font-semibold",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "rounded-full font-medium active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, cn };



