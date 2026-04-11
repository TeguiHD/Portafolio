"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkillGroup
                title="Match directo"
                subtitle="Ya en tu CV"
                skills={matched}
                icon={<CheckCircle2 className="w-4 h-4" />}
                color="emerald"
            />
            <SkillGroup
                title="Brechas blandas"
                subtitle="Se agregan con semantica transferible"
                skills={recommended}
                icon={<AlertTriangle className="w-4 h-4" />}
                color="amber"
            />
            <SkillGroup
                title="Brechas duras"
                subtitle="Aprendizaje sugerido - NO se inventan"
                skills={missing}
                icon={<XCircle className="w-4 h-4" />}
                color="red"
            />
        </div>
    );
}

function SkillGroup({
    title,
    subtitle,
    skills,
    icon,
    color,
}: {
    title: string;
    subtitle: string;
    skills: string[];
    icon: React.ReactNode;
    color: "emerald" | "amber" | "red";
}) {
    const styles = {
        emerald: {
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/20",
            titleColor: "text-emerald-300",
            badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
        },
        amber: {
            bg: "bg-amber-500/5",
            border: "border-amber-500/20",
            titleColor: "text-amber-300",
            badge: "bg-amber-500/10 text-amber-300 border-amber-500/25",
        },
        red: {
            bg: "bg-red-500/5",
            border: "border-red-500/20",
            titleColor: "text-red-300",
            badge: "bg-red-500/10 text-red-300 border-red-500/25",
        },
    }[color];

    return (
        <div className={`rounded-2xl ${styles.bg} border ${styles.border} p-4`}>
            <div className={`flex items-center gap-2 mb-1 ${styles.titleColor}`}>
                {icon}
                <h3 className="text-sm font-bold">{title}</h3>
                <span className="ml-auto text-xs font-mono text-neutral-500">
                    {skills.length}
                </span>
            </div>
            <p className="text-[10px] text-neutral-500 mb-3">{subtitle}</p>
            {skills.length === 0 ? (
                <p className="text-xs text-neutral-600 italic">Ninguna detectada</p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                        <span
                            key={skill}
                            className={`text-xs px-2 py-0.5 rounded-md border ${styles.badge}`}
                        >
                            {skill}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
