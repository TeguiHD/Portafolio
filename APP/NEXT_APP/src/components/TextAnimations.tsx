"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface TextRevealProps {
    text: string;
    className?: string;
    colored?: boolean;
    delay?: number;
}

// Letter-by-letter reveal animation
export function TextReveal({
    text,
    className = "",
    colored = false,
    delay = 0
}: TextRevealProps) {
    const [isMounted, setIsMounted] = useState(false);
    const words = text.split(" ");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <span className={className}>
            {words.map((word, wordIdx) => (
                <span key={wordIdx} className="inline-block mr-[0.25em]">
                    {word.split("").map((char, charIdx) => (
                        <motion.span
                            key={charIdx}
                            className="inline-block"
                            initial={isMounted ? { opacity: 0, y: 20, rotateX: 90 } : false}
                            animate={{ opacity: 1, y: 0, rotateX: 0 }}
                            transition={{
                                duration: 0.5,
                                delay: delay + (wordIdx * 0.08) + (charIdx * 0.03),
                                ease: [0.215, 0.61, 0.355, 1],
                            }}
                            style={{
                                transformStyle: "preserve-3d",
                                display: "inline-block",
                            }}
                        >
                            {colored ? (
                                <span
                                    className="bg-gradient-to-r from-accent-1 via-accent-1/90 to-accent-2 bg-clip-text text-transparent"
                                >
                                    {char}
                                </span>
                            ) : (
                                char
                            )}
                        </motion.span>
                    ))}
                </span>
            ))}
        </span>
    );
}

// Parallax scroll text effect
interface ParallaxTextProps {
    children: React.ReactNode;
    speed?: number;
    className?: string;
    direction?: "up" | "down";
}

export function ParallaxText({
    children,
    speed = 0.5,
    className = "",
    direction = "up"
}: ParallaxTextProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const multiplier = direction === "up" ? -1 : 1;
    const y = useTransform(scrollYProgress, [0, 1], [0, 200 * speed * multiplier]);
    const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

    return (
        <motion.div
            ref={ref}
            style={{ y: smoothY }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Split line reveal (for paragraphs)
interface SplitLineRevealProps {
    text: string;
    className?: string;
    lineClassName?: string;
}

export function SplitLineReveal({
    text,
    className = "",
    lineClassName = ""
}: SplitLineRevealProps) {
    const [isMounted, setIsMounted] = useState(false);
    // Split text into lines (by sentence or manually with \n)
    const lines = text.split(/(?<=[.!?])\s+|\n/).filter(Boolean);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className={className}>
            {lines.map((line, idx) => (
                <div key={idx} className="overflow-hidden">
                    <motion.p
                        className={lineClassName}
                        initial={isMounted ? { y: "100%", opacity: 0 } : false}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{
                            duration: 0.6,
                            delay: idx * 0.15,
                            ease: [0.25, 0.4, 0.25, 1],
                        }}
                    >
                        {line}
                    </motion.p>
                </div>
            ))}
        </div>
    );
}

// Highlight text on scroll
interface HighlightOnScrollProps {
    text: string;
    className?: string;
    highlightColor?: string;
}

export function HighlightOnScroll({
    text,
    className = "",
    highlightColor = "rgba(124, 242, 212, 0.3)"
}: HighlightOnScrollProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start 0.9", "start 0.5"],
    });

    const background = useTransform(
        scrollYProgress,
        [0, 1],
        [`linear-gradient(90deg, ${highlightColor} 0%, transparent 0%)`,
        `linear-gradient(90deg, ${highlightColor} 100%, transparent 100%)`]
    );

    return (
        <motion.span
            ref={ref}
            className={`px-1 -mx-1 ${className}`}
            style={{ background }}
        >
            {text}
        </motion.span>
    );
}

// Counter animation for numbers
interface AnimatedCounterProps {
    value: number;
    suffix?: string;
    prefix?: string;
    duration?: number;
    className?: string;
}

export function AnimatedCounter({
    value,
    suffix = "",
    prefix = "",
    duration = 2,
    className = ""
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [displayValue, setDisplayValue] = useState(0);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        if (!isInView) return;

        let start = 0;
        const end = value;
        const increment = end / (duration * 60);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.round(start));
            }
        }, 1000 / 60);

        return () => clearInterval(timer);
    }, [isInView, value, duration]);

    return (
        <span ref={ref} className={className}>
            {prefix}{displayValue}{suffix}
        </span>
    );
}

