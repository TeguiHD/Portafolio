"use client";

import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

interface StudioCardProps {
    title?: string;
    eyebrow?: string;
    description?: string;
    accentColor: string;
    actions?: ReactNode;
    className?: string;
    children: ReactNode;
}

interface StudioStageProps {
    title: string;
    subtitle?: string;
    accentColor: string;
    badge?: string;
    checkerboard?: boolean;
    className?: string;
    children: ReactNode;
}

interface StudioMetricProps {
    label: string;
    value: ReactNode;
    accentColor: string;
    className?: string;
}

interface StudioChipProps {
    active?: boolean;
    accentColor: string;
    className?: string;
    children: ReactNode;
}

const checkerboardStyle: CSSProperties = {
    backgroundImage: "linear-gradient(45deg, rgba(15,23,36,0.92) 25%, transparent 25%), linear-gradient(-45deg, rgba(15,23,36,0.92) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(15,23,36,0.92) 75%), linear-gradient(-45deg, transparent 75%, rgba(15,23,36,0.92) 75%)",
    backgroundSize: "22px 22px",
    backgroundPosition: "0 0, 0 11px, 11px -11px, -11px 0px",
};

export function StudioCard({
    title,
    eyebrow,
    description,
    accentColor,
    actions,
    className,
    children,
}: StudioCardProps) {
    return (
        <section
            className={clsx(
                "rounded-[28px] border border-white/10 bg-white/[0.035] p-4 sm:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl",
                className
            )}
            style={{
                backgroundImage: `radial-gradient(circle at top right, ${accentColor}16, transparent 35%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
            }}
        >
            {(title || eyebrow || description || actions) && (
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        {eyebrow && (
                            <p
                                className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
                                style={{ color: accentColor }}
                            >
                                {eyebrow}
                            </p>
                        )}
                        {title && <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>}
                        {description && <p className="mt-1 text-sm leading-6 text-neutral-400">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}

export function StudioStage({
    title,
    subtitle,
    accentColor,
    badge,
    checkerboard,
    className,
    children,
}: StudioStageProps) {
    return (
        <div className={clsx("overflow-hidden rounded-[24px] border border-white/10 bg-[#08111f]/90", className)}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                    <p className="text-sm font-medium text-white">{title}</p>
                    {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
                </div>
                {badge && (
                    <span
                        className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        style={{ borderColor: `${accentColor}50`, color: accentColor, backgroundColor: `${accentColor}18` }}
                    >
                        {badge}
                    </span>
                )}
            </div>
            <div
                className="relative flex min-h-[280px] items-center justify-center overflow-hidden p-4"
                style={checkerboard ? checkerboardStyle : undefined}
            >
                {children}
            </div>
        </div>
    );
}

export function StudioMetric({ label, value, accentColor, className }: StudioMetricProps) {
    return (
        <div
            className={clsx(
                "rounded-2xl border border-white/10 bg-black/20 px-4 py-3",
                className
            )}
            style={{ boxShadow: `inset 0 1px 0 ${accentColor}12` }}
        >
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
            <div className="mt-1 text-sm font-medium text-white">{value}</div>
        </div>
    );
}

export function StudioChip({ active, accentColor, className, children }: StudioChipProps) {
    return (
        <span
            className={clsx(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                active ? "text-white" : "border-white/10 bg-white/5 text-neutral-400",
                className
            )}
            style={active ? { borderColor: `${accentColor}70`, backgroundColor: `${accentColor}22` } : undefined}
        >
            {children}
        </span>
    );
}