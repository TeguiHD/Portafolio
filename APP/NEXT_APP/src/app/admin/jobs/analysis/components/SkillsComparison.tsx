"use client";

import { useId } from "react";
import { CircleCheck, TriangleAlert, CircleX } from "lucide-react";

export function SkillsComparison({
    matched,
    recommended,
    missing,
}: {
    matched: string[];
    recommended: string[];
    missing: string[];
}) {
    return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            <SkillGroup
                title="Coinciden"
                subtitle="Ya están en tu CV."
                skills={matched}
                icon={<CircleCheck className="size-4 text-emerald-400" aria-hidden="true" />}
                chip="bg-emerald-500/10 text-emerald-400"
            />
            <SkillGroup
                title="Brechas blandas"
                subtitle="Se reformulan desde lo que ya sabes hacer."
                skills={recommended}
                icon={<TriangleAlert className="size-4 text-amber-400" aria-hidden="true" />}
                chip="bg-amber-500/10 text-amber-400"
            />
            <SkillGroup
                title="Brechas duras"
                subtitle="Aprendizaje sugerido; no se agregan al CV."
                skills={missing}
                icon={<CircleX className="size-4 text-red-400" aria-hidden="true" />}
                chip="bg-red-500/10 text-red-400"
            />
        </div>
    );
}

function SkillGroup({
    title,
    subtitle,
    skills,
    icon,
    chip,
}: {
    title: string;
    subtitle: string;
    skills: string[];
    icon: React.ReactNode;
    chip: string;
}) {
    const id = useId();
    return (
        <section aria-labelledby={id} className="border-t border-[var(--linea)] pt-4">
            <h3 id={id} className="m-0 flex items-center gap-2 text-sm font-semibold text-[var(--txt)]">
                {icon}
                {title}
                <span className="ml-auto font-mono text-xs font-medium tabular-nums text-[var(--mut)]">{skills.length}</span>
            </h3>
            <p className="mb-3 mt-1 text-xs text-[var(--mut)]">{subtitle}</p>
            {skills.length === 0 ? (
                <p className="text-sm text-[var(--mut)]">Ninguna detectada.</p>
            ) : (
                <ul className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                        <li key={skill} className={`rounded-md px-2 py-0.5 text-xs ${chip}`}>
                            {skill}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
