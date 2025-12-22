"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";

// Context to share Lenis instance with child components
const LenisContext = createContext<Lenis | null>(null);

// Hook to access Lenis instance
export function useLenis() {
    return useContext(LenisContext);
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
    const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            touchMultiplier: 2,
        });

        setLenisInstance(lenis);

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
            setLenisInstance(null);
        };
    }, []);

    return (
        <LenisContext.Provider value={lenisInstance}>
            {children}
        </LenisContext.Provider>
    );
}
