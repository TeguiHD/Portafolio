"use client";

import { MotionConfig } from "framer-motion";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * `reducedMotion="user"` hace que TODO framer-motion del sitio respete la
 * preferencia del sistema sin tocar cada componente. Antes se respetaba a
 * parches (hero, tools-belt, cursor) y el resto la ignoraba.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
    return (
        <MotionConfig
            reducedMotion="user"
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        >
            {children}
        </MotionConfig>
    );
}
