"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ReactNode } from "react";

interface MagneticCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function MagneticCard({ children, className, intensity = 1 }: MagneticCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Suavizar el movimiento con springs
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });

  // Rotación 3D mejorada
  const rotateX = useTransform(springY, [-50, 50], [12 * intensity, -12 * intensity]);
  const rotateY = useTransform(springX, [-50, 50], [-18 * intensity, 18 * intensity]);

  // Movimiento suave
  const translateX = useTransform(springX, (v) => v * 0.08 * intensity);
  const translateY = useTransform(springY, (v) => v * 0.08 * intensity);

  // Escala sutil en hover
  const scale = useTransform(
    springX,
    (v) => 1 + Math.min(Math.abs(v) / 1000, 0.05) * intensity
  );

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (e.clientX - centerX) * 0.5;
    const dy = (e.clientY - centerY) * 0.5;
    x.set(dx);
    y.set(dy);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={className}
      style={{
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
        x: translateX,
        y: translateY,
        scale,
        perspective: "1000px",
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

