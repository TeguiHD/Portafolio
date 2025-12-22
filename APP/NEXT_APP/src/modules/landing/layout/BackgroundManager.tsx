"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

const sectionColors: Record<string, string> = {
    hero: "bg-[#0a0a0a]", // Deep Black
    "tools-belt": "bg-[#0f172a]", // Slate 900
    vault: "bg-[#1a120b]", // Amber Dark
    casos: "bg-[#051e3b]", // Blue Dark
    tecnologias: "bg-[#0f0f0f]", // Neutral Dark
    contact: "bg-black",
};

export function BackgroundManager() {
    const { scrollY } = useScroll();
    const [activeSection, setActiveSection] = useState("hero");

    useMotionValueEvent(scrollY, "change", (latest) => {
        // Simple heuristic: check which section is mostly visible
        // In a real 'Awwwards' site, we'd use InteractionObserver on sections
        // For now, we estimate based on window height (vh) units roughly
        const vh = typeof window !== 'undefined' ? window.innerHeight : 900;

        // Thresholds
        if (latest < vh * 0.8) setActiveSection("hero");
        else if (latest < vh * 2) setActiveSection("tools-belt");
        else if (latest < vh * 3.5) setActiveSection("vault");
        else if (latest < vh * 5) setActiveSection("casos");
        else if (latest < vh * 6.5) setActiveSection("tecnologias");
        else setActiveSection("contact");
    });

    return (
        <div className="fixed inset-0 -z-50 transition-colors duration-[1500ms] ease-in-out pointer-events-none">
            {/* Base Color Layer */}
            <div className={`absolute inset-0 transition-colors duration-[1500ms] ${sectionColors[activeSection] || "bg-black"}`} />

            {/* Animated Gradient Mesh (Noise) - using inline SVG pattern */}
            <div
                className="absolute inset-0 opacity-20 mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                }}
            />

            {/* Dynamic Glow Orb */}
            <motion.div
                animate={{
                    background: activeSection === 'vault' ? 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0) 70%)'
                        : activeSection === 'hero' ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)'
                            : 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 70%)',
                    scale: [1, 1.2, 1],
                    x: activeSection === 'hero' ? '0%' : activeSection === 'tools-belt' ? '-30%' : '30%',
                    y: activeSection === 'hero' ? '0%' : activeSection === 'vault' ? '-20%' : '20%',
                }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full"
            />
        </div>
    );
}
