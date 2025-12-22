"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    duration: number;
    delay: number;
}

interface ParticleBackgroundProps {
    particleCount?: number;
    className?: string;
}

// Seeded random for deterministic values
function seededRandom(seed: number): () => number {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

export function ParticleBackground({
    particleCount = 30,
    className = ""
}: ParticleBackgroundProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [mounted, setMounted] = useState(false);

    // Generate particles only on client side to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
        const colors = [
            "rgba(124, 242, 212, 0.6)",
            "rgba(240, 165, 0, 0.5)",
            "rgba(143, 166, 255, 0.5)",
            "rgba(255, 255, 255, 0.4)",
        ];

        const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
            const random = seededRandom(i * 1000 + Date.now() % 1000);
            return {
                id: i,
                x: random() * 100,
                y: random() * 100,
                size: random() * 3 + 1,
                color: colors[Math.floor(random() * colors.length)],
                duration: random() * 20 + 15,
                delay: random() * 5,
            };
        });
        setParticles(newParticles);
    }, [particleCount]);

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
        >
            {mounted && particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        backgroundColor: particle.color,
                        boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
                    }}
                    animate={{
                        y: [0, -30, 0, 20, 0],
                        x: [0, 15, -10, 5, 0],
                        opacity: [0.3, 0.6, 0.4, 0.7, 0.3],
                        scale: [1, 1.2, 0.9, 1.1, 1],
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}

            {/* Larger glowing orbs */}
            <motion.div
                className="absolute w-64 h-64 rounded-full blur-[80px]"
                style={{
                    left: "10%",
                    top: "20%",
                    background: "radial-gradient(circle, rgba(124,242,212,0.15) 0%, transparent 70%)",
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            <motion.div
                className="absolute w-80 h-80 rounded-full blur-[100px]"
                style={{
                    right: "15%",
                    top: "40%",
                    background: "radial-gradient(circle, rgba(240,165,0,0.12) 0%, transparent 70%)",
                }}
                animate={{
                    x: [0, -40, 0],
                    y: [0, -25, 0],
                    scale: [1, 0.9, 1],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            <motion.div
                className="absolute w-56 h-56 rounded-full blur-[70px]"
                style={{
                    left: "40%",
                    bottom: "15%",
                    background: "radial-gradient(circle, rgba(143,166,255,0.12) 0%, transparent 70%)",
                }}
                animate={{
                    x: [0, 30, -20, 0],
                    y: [0, -20, 15, 0],
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}
