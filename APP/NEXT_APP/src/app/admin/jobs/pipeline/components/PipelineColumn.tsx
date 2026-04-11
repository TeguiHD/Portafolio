"use client";

import { DragEvent, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import type { ApplicationStatus } from "../../types";

const COLUMN_STYLES: Record<ApplicationStatus, { gradient: string; border: string; accent: string }> = {
    PENDING: { gradient: "from-blue-500/10 to-cyan-500/5", border: "border-blue-500/20", accent: "text-blue-300" },
    CV_ADAPTED: { gradient: "from-purple-500/10 to-indigo-500/5", border: "border-purple-500/20", accent: "text-purple-300" },
    CV_SENT: { gradient: "from-sky-500/10 to-blue-500/5", border: "border-sky-500/20", accent: "text-sky-300" },
    INTERVIEW: { gradient: "from-amber-500/10 to-yellow-500/5", border: "border-amber-500/20", accent: "text-amber-300" },
    ACCEPTED: { gradient: "from-emerald-500/10 to-green-500/5", border: "border-emerald-500/20", accent: "text-emerald-300" },
    REJECTED: { gradient: "from-red-500/10 to-rose-500/5", border: "border-red-500/20", accent: "text-red-300" },
    CLOSED: { gradient: "from-neutral-500/10 to-slate-500/5", border: "border-neutral-500/20", accent: "text-neutral-400" },
};

export function PipelineColumn({
    status,
    label,
    count,
    onDrop,
    onDragOver,
    children,
}: {
    status: ApplicationStatus;
    label: string;
    count: number;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    children: ReactNode;
}) {
    const style = COLUMN_STYLES[status];

    return (
        <div
            className={`flex flex-col rounded-2xl bg-gradient-to-b ${style.gradient} border ${style.border} backdrop-blur-md min-h-[300px]`}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${style.accent}`}>
                        {label}
                    </h3>
                    <span className="text-xs font-semibold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                        {count}
                    </span>
                </div>
            </div>

            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <AnimatePresence>{children}</AnimatePresence>
                {count === 0 && (
                    <div className="text-center py-10 text-xs text-neutral-600">
                        Sin postulaciones aqui
                    </div>
                )}
            </div>
        </div>
    );
}
