"use client";

import { useEffect, useMemo, useState } from "react";

const sectionColors: Record<string, string> = {
    hero: "bg-[#0a0a0a]",
    "tools-belt": "bg-[#0f172a]",
    vault: "bg-[#1a120b]",
    casos: "bg-[#051e3b]",
    tecnologias: "bg-[#0f0f0f]",
    contact: "bg-black",
};

const orbStyles: Record<string, { background: string; transform: string }> = {
    hero: {
        background:
            "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 35%)",
        transform: "translate3d(0%, 0%, 0) scale(1)",
    },
    "tools-belt": {
        background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 35%)",
        transform: "translate3d(-15%, 6%, 0) scale(1.15)",
    },
    vault: {
        background:
            "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0) 35%)",
        transform: "translate3d(10%, -10%, 0) scale(1.2)",
    },
    casos: {
        background:
            "radial-gradient(circle, rgba(59,130,246,0.10) 0%, rgba(0,0,0,0) 35%)",
        transform: "translate3d(15%, 10%, 0) scale(1.12)",
    },
    tecnologias: {
        background:
            "radial-gradient(circle, rgba(148,163,184,0.09) 0%, rgba(0,0,0,0) 35%)",
        transform: "translate3d(8%, 6%, 0) scale(1.1)",
    },
    contact: {
        background:
            "radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 35%)",
        transform: "translate3d(0%, 12%, 0) scale(1.05)",
    },
};

function getSectionForScroll(latest: number, viewportHeight: number) {
    if (latest < viewportHeight * 0.8) return "hero";
    if (latest < viewportHeight * 2) return "tools-belt";
    if (latest < viewportHeight * 3.5) return "vault";
    if (latest < viewportHeight * 5) return "casos";
    if (latest < viewportHeight * 6.5) return "tecnologias";
    return "contact";
}

export function BackgroundManager() {
    const [activeSection, setActiveSection] = useState("hero");

    useEffect(() => {
        let rafId: number | null = null;

        const updateSection = () => {
            rafId = null;
            const nextSection = getSectionForScroll(window.scrollY, window.innerHeight || 900);
            setActiveSection((prev) => (prev === nextSection ? prev : nextSection));
        };

        const requestUpdate = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(updateSection);
        };

        requestUpdate();
        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate, { passive: true });

        return () => {
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
            window.removeEventListener("scroll", requestUpdate);
            window.removeEventListener("resize", requestUpdate);
        };
    }, []);

    const activeOrbStyle = useMemo(
        () => orbStyles[activeSection] ?? orbStyles.hero,
        [activeSection]
    );

    return (
        <div className="fixed inset-0 -z-50 transition-colors duration-[1500ms] ease-in-out pointer-events-none">
            <div
                className={`absolute inset-0 transition-colors duration-[1500ms] ${
                    sectionColors[activeSection] || "bg-black"
                }`}
            />

            <div
                className="absolute inset-0 opacity-20 mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "repeat",
                }}
            />

            <div
                className="absolute -inset-[50%] w-[200%] h-[200%] transition-[transform,background] duration-700 ease-out animate-[pulse_14s_ease-in-out_infinite]"
                style={activeOrbStyle}
            />
        </div>
    );
}
