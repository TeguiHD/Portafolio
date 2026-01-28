"use client";

import { useRef, useState, ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";

interface Card3DProps {
    children: ReactNode;
    className?: string;
    intensity?: number;
    glareEnabled?: boolean;
    borderGlow?: boolean;
    perspective?: number;
}

export function Card3D({
    children,
    className = "",
    intensity = 15,
    glareEnabled = true,
    borderGlow = true,
    perspective = 1000,
}: Card3DProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]), {
        stiffness: 300,
        damping: 30,
    });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]), {
        stiffness: 300,
        damping: 30,
    });

    const glareX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
    const glareY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
        setIsHovered(false);
    };

    return (
        <motion.div
            ref={cardRef}
            className={`relative ${className}`}
            style={{
                perspective,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                className="relative w-full h-full"
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
            >
                {/* Border glow effect */}
                {borderGlow && (
                    <motion.div
                        className="absolute -inset-[1px] rounded-[inherit] opacity-0 transition-opacity duration-300"
                        style={{
                            background: "linear-gradient(135deg, rgba(124,242,212,0.5), rgba(240,165,0,0.5))",
                            filter: "blur(8px)",
                            opacity: isHovered ? 0.6 : 0,
                        }}
                    />
                )}

                {/* Main card content */}
                <div className="relative w-full h-full rounded-[inherit] overflow-hidden">
                    {children}

                    {/* Glare effect */}
                    {glareEnabled && (
                        <motion.div
                            className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300"
                            style={{
                                background: `radial-gradient(circle at ${glareX}px ${glareY}px, rgba(255,255,255,0.25), transparent 50%)`,
                                opacity: isHovered ? 0.4 : 0,
                            }}
                        />
                    )}
                </div>

                {/* Floating shadow */}
                <motion.div
                    className="absolute inset-x-4 -bottom-4 h-8 rounded-full blur-xl transition-all duration-300"
                    style={{
                        background: "rgba(0,0,0,0.4)",
                        opacity: isHovered ? 0.6 : 0.3,
                        transform: isHovered ? "translateY(8px) scale(0.95)" : "translateY(0) scale(0.9)",
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

// ============================================
// Individual floating layer component
// Each layer manages its own hooks (React-compliant)
// ============================================
interface FloatingLayerProps {
    children: ReactNode;
    mouseX: MotionValue<number>;
    mouseY: MotionValue<number>;
    depth: number; // Layer depth multiplier (1, 2, 3, etc.)
}

function FloatingLayer({ children, mouseX, mouseY, depth }: FloatingLayerProps) {
    // Each layer has its own useTransform hooks - React compliant
    const x = useTransform(mouseX, [-0.5, 0.5], [depth * -15, depth * 15]);
    const y = useTransform(mouseY, [-0.5, 0.5], [depth * -15, depth * 15]);

    return (
        <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
                x,
                y,
                translateZ: depth * 25,
                transformStyle: "preserve-3d",
            }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// Layered 3D card with stacked elements
// ============================================
interface Card3DLayeredProps {
    children: ReactNode;
    layers?: ReactNode[];
    className?: string;
    intensity?: number;
}

export function Card3DLayered({
    children,
    layers = [],
    className = "",
    intensity = 12,
}: Card3DLayeredProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]), {
        stiffness: 260,
        damping: 25,
    });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]), {
        stiffness: 260,
        damping: 25,
    });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            className={`relative ${className}`}
            style={{
                perspective: 1200,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                className="relative w-full h-full"
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
            >
                {/* Base layer (children) */}
                <div className="relative" style={{ transform: "translateZ(0px)" }}>
                    {children}
                </div>

                {/* Floating layers - each layer is a separate component with its own hooks */}
                {layers.map((layer, i) => (
                    <FloatingLayer
                        key={i}
                        mouseX={mouseX}
                        mouseY={mouseY}
                        depth={i + 1}
                    >
                        {layer}
                    </FloatingLayer>
                ))}
            </motion.div>
        </motion.div>
    );
}
