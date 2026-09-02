"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Transición entre rutas: un fade corto al navegar.
 *
 * Dos decisiones deliberadas:
 *  1. Solo `opacity`, nunca `transform`. Un transform en este wrapper lo
 *     convertiría en containing block de los navbars `position: fixed`, que
 *     saltarían durante la animación.
 *  2. Solo anima en navegaciones de cliente. En el primer render no hay
 *     `initial`, así que el HTML servido jamás lleva `opacity: 0`: los
 *     crawlers sin JS y el primer pintado ven el contenido tal cual.
 *     El flag se activa en `useEffect` (solo cliente) para que el módulo
 *     del servidor nunca lo herede entre requests.
 */
let hasNavigatedBefore = false;

export default function Template({ children }: { children: React.ReactNode }) {
    const animateIn = hasNavigatedBefore;

    useEffect(() => {
        hasNavigatedBefore = true;
    }, []);

    return (
        <motion.div
            initial={animateIn ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        >
            {children}
        </motion.div>
    );
}
