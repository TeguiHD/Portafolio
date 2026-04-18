"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/Button";

interface WidgetCardProps {
  title: string;
  eyebrow?: string;
  accent?: "blue" | "cyan" | "amber" | "emerald" | "violet";
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

const accentStyles = {
  blue: "from-cyan-400/20 via-sky-500/10 to-transparent border-cyan-400/20",
  cyan: "from-emerald-400/20 via-cyan-500/10 to-transparent border-cyan-300/20",
  amber: "from-amber-400/20 via-orange-500/10 to-transparent border-amber-300/20",
  emerald: "from-emerald-400/20 via-lime-500/10 to-transparent border-emerald-300/20",
  violet: "from-violet-400/20 via-fuchsia-500/10 to-transparent border-violet-300/20",
} as const;

export function WidgetCard({
  title,
  eyebrow,
  accent = "blue",
  actions,
  children,
  className,
}: WidgetCardProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border bg-white/[0.03] p-5 sm:p-6 backdrop-blur-xl",
        "shadow-[0_24px_80px_-40px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", accentStyles[accent])} aria-hidden="true" />
      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/45">{eyebrow}</p>
            ) : null}
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
