import type { ReactNode } from "react";
import { TOOL_ICONS } from "./ToolIcons";

export function ToolPageHeader({ slug, title, description }: { slug: string; title: ReactNode; description?: ReactNode }) {
    const Icon = TOOL_ICONS[slug];
    return (
        <header className="tool-page-heading group mb-5 flex items-center gap-3">
            {Icon && <span className="tool-glyph flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-300/15 bg-teal-300/[0.06] text-teal-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>}
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">{description}</p>}
            </div>
        </header>
    );
}
