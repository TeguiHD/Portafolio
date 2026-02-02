"use client";

import { createContext, useContext } from "react";

// Context placeholder (Lenis disabled)
const LenisContext = createContext<null>(null);

// Hook to access Lenis instance (returns null - Lenis disabled)
export function useLenis() {
    return useContext(LenisContext);
}

// SmoothScroll now just passes through children - no scroll manipulation
export function SmoothScroll({ children }: { children: React.ReactNode }) {
    return (
        <LenisContext.Provider value={null}>
            {children}
        </LenisContext.Provider>
    );
}
