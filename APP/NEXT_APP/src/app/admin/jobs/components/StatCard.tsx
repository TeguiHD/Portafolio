import type { ReactNode } from "react";

export function StatCard({
    label,
    value,
    total,
    icon,
    gradient,
    border,
    hint,
}: {
    label: string;
    value: ReactNode;
    total?: ReactNode;
    icon: ReactNode;
    gradient: string;
    border: string;
    hint?: string;
}) {
    return (
        <div
            className={`relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br ${gradient} border ${border} backdrop-blur-md group hover:-translate-y-1 transition-all duration-300 shadow-lg`}
        >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl filter drop-shadow-md">{icon}</span>
                </div>
                <p className="text-4xl font-extrabold text-white tracking-tight">{value}</p>
                <p className="text-sm font-medium text-neutral-300 mt-2">
                    {label}
                    {total !== undefined && total !== null && (
                        <span className="text-neutral-500 font-normal"> / {total} total</span>
                    )}
                </p>
                {hint && <p className="text-xs text-neutral-500 mt-2">{hint}</p>}
            </div>
        </div>
    );
}
