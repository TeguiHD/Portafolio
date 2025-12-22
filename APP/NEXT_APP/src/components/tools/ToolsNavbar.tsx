"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function ToolsNavbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let lastY = window.scrollY;
        let ticking = false;

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const y = window.scrollY;
                    setIsScrolled(y > 50);

                    // Show on scroll up, hide on scroll down (después de 50px)
                    if (y > 50) {
                        setIsVisible(y <= lastY);
                    } else {
                        setIsVisible(true);
                    }

                    lastY = y;
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: 0, opacity: 1 }}
            animate={{
                y: isVisible ? 0 : -100,
                opacity: isVisible ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl transition-all duration-300 ${isScrolled
                    ? "bg-[#0F1724]/95 shadow-lg"
                    : "bg-[#0F1724]/80"
                }`}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-3 group"
                >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF8A00]/20 to-[#00B8A9]/20 border border-[#FF8A00]/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <span className="text-sm font-bold text-[#FF8A00]">NL</span>
                    </div>
                    <span className="text-white font-medium hidden sm:inline">Nicoholas Lopetegui</span>
                </Link>
                <Link
                    href="/"
                    className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver al portfolio
                </Link>
            </div>
        </motion.header>
    );
}
