import type { ReactNode } from "react";
import { TOOL_ICONS } from "./ToolIcons";

export function ToolPageHeader({ slug, title, description }: { slug: string; title: ReactNode; description?: ReactNode }) {
    const Icon = TOOL_ICONS[slug];
    return (
        <header className="mb-8 flex items-start gap-4 border-b border-white/[0.06] pb-6">
            {Icon && <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300"><Icon className="h-6 w-6" aria-hidden="true" /></span>}
            <div className="min-w-0">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">NICOHOLAS / TOOLS</p>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
                {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>}
            </div>
        </header>
    );
}
