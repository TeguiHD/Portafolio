"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { motion, useInView, Variants, HTMLMotionProps } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
    children: ReactNode;
    variant?: "fade" | "slide-up" | "slide-left" | "slide-right" | "scale" | "rotate-3d";
    delay?: number;
    duration?: number;
    triggerOnce?: boolean;
    threshold?: number;
    stagger?: number;
    parallax?: boolean;
    parallaxSpeed?: number;
}

const variants: Record<string, Variants> = {
    "fade": {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    },
    "slide-up": {
        hidden: { opacity: 0, y: 60 },
        visible: { opacity: 1, y: 0 },
    },
    "slide-left": {
        hidden: { opacity: 0, x: 80 },
        visible: { opacity: 1, x: 0 },
    },
    "slide-right": {
        hidden: { opacity: 0, x: -80 },
        visible: { opacity: 1, x: 0 },
    },
    "scale": {
        hidden: { opacity: 0, scale: 0.85 },
        visible: { opacity: 1, scale: 1 },
    },
    "rotate-3d": {
        hidden: { opacity: 0, rotateX: 25, y: 40 },
        visible: { opacity: 1, rotateX: 0, y: 0 },
    },
};

export function ScrollReveal({
    children,
    variant = "slide-up",
    delay = 0,
    duration = 0.6,
    triggerOnce = true,
    threshold = 0.15,
    parallax = false,
    parallaxSpeed = 0.3,
    className,
    ...props
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const isInView = useInView(ref, {
        once: triggerOnce,
        margin: `-${Math.round(threshold * 100)}px` as `${number}px`
    });

    // Track client-side mount to prevent SSR animation mismatch
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // GSAP Parallax effect
    useEffect(() => {
        if (!parallax || !ref.current) return;

        const element = ref.current;

        gsap.to(element, {
            y: () => -100 * parallaxSpeed,
            ease: "none",
            scrollTrigger: {
                trigger: element,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
            },
        });

        return () => {
            ScrollTrigger.getAll().forEach((trigger) => {
                if (trigger.vars.trigger === element) {
                    trigger.kill();
                }
            });
        };
    }, [parallax, parallaxSpeed]);

    return (
        <motion.div
            ref={ref}
            variants={variants[variant]}
            initial={isMounted ? "hidden" : "visible"}
            animate={isInView ? "visible" : "hidden"}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.4, 0.25, 1],
            }}
            className={className}
            style={{ transformStyle: "preserve-3d" }}
            {...props}
        >
            {children}
        </motion.div>
    );
}

// Staggered children wrapper
interface ScrollRevealGroupProps {
    children: ReactNode;
    staggerDelay?: number;
    className?: string;
}

export function ScrollRevealGroup({
    children,
    staggerDelay = 0.1,
    className
}: ScrollRevealGroupProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <motion.div
            ref={ref}
            initial={isMounted ? "hidden" : "visible"}
            animate={isInView ? "visible" : "hidden"}
            variants={{
                hidden: { opacity: 1 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Individual stagger child
export function ScrollRevealItem({
    children,
    className
}: {
    children: ReactNode;
    className?: string
}) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
