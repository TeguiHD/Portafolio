"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useMotionValue, useTransform } from "framer-motion";

export function MouseTracker() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Velocity tracking
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(Date.now());

  // Motion values for cursor position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Velocity motion values
  const velocityX = useMotionValue(0);
  const velocityY = useMotionValue(0);

  // Main cursor - fast and responsive
  const cursorX = useSpring(mouseX, { stiffness: 800, damping: 35, mass: 0.2 });
  const cursorY = useSpring(mouseY, { stiffness: 800, damping: 35, mass: 0.2 });

  // Ring position - smooth following
  const ringX = useSpring(mouseX, { stiffness: 350, damping: 28, mass: 0.5 });
  const ringY = useSpring(mouseY, { stiffness: 350, damping: 28, mass: 0.5 });

  // Outer glow
  const glowX = useSpring(mouseX, { stiffness: 80, damping: 15, mass: 1.5 });
  const glowY = useSpring(mouseY, { stiffness: 80, damping: 15, mass: 1.5 });

  // Smooth velocity for shape morphing
  const smoothVelocityX = useSpring(velocityX, { stiffness: 60, damping: 15 });
  const smoothVelocityY = useSpring(velocityY, { stiffness: 60, damping: 15 });

  // Calculate rotation angle from velocity direction
  const rotationAngle = useTransform(
    [smoothVelocityX, smoothVelocityY],
    ([vx, vy]: number[]) => {
      const magnitude = Math.sqrt(vx * vx + vy * vy);
      if (magnitude < 0.1) return 0;
      // Calculate angle in degrees
      const angle = Math.atan2(vy, vx) * (180 / Math.PI);

      // Standard CSS rotation 0deg is pointing Right.
      // Border-radius: 0 50% 50% 50% creates a shape pointing Top-Left (-135deg).
      // We want the sharp point (Top-Left) to point OPPOSITE to movement.
      // If moving Right (0deg), we want point to be Left (180deg).
      // PointAngle + Rotation = TargetAngle
      // -135 + Rotation = 180 => Rotation = 315 (-45)
      return angle - 45;
    }
  );

  // Calculate deformation intensity based on velocity
  const deformation = useTransform(
    [smoothVelocityX, smoothVelocityY],
    ([vx, vy]: number[]) => {
      const magnitude = Math.sqrt(vx * vx + vy * vy);
      // Map magnitude to a percentage for the sharp corner (0% = sharp, 50% = circle)
      // High speed -> 0% (sharp teardrop)
      // Still -> 50% (circle)
      // Increased sensitivity: multiplied by 6 instead of 2.5
      const sharpValue = Math.max(0, 50 - Math.min(magnitude * 6, 50));
      return `${sharpValue}%`;
    }
  );

  // Create the border-radius string dynamically
  // 0 50% 50% 50% creates a teardrop pointing Top-Left
  const borderRadius = useTransform(deformation, (v) => `${v} 50% 50% 50%`);

  // Scale stretch based on velocity
  const scaleLong = useTransform(
    [smoothVelocityX, smoothVelocityY],
    ([vx, vy]: number[]) => {
      const magnitude = Math.sqrt(vx * vx + vy * vy);
      return 1 + Math.min(magnitude * 0.02, 0.4);
    }
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // More robust touch device detection
    // Check for touch capability AND lack of fine pointer (mouse)
    const checkIsTouchDevice = () => {
      // Media query for devices that don't have hover capability (pure touch devices)
      const hasNoHover = window.matchMedia("(hover: none)").matches;
      // Media query for coarse pointer (touch screens)
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      // Traditional touch detection
      const hasTouchEvents = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Consider it a touch device if:
      // 1. It has no hover capability AND has touch events, OR
      // 2. It only has coarse pointer (no fine pointer like mouse)
      return (hasNoHover && hasTouchEvents) || (hasCoarsePointer && !window.matchMedia("(pointer: fine)").matches);
    };

    const isTouchDevice = checkIsTouchDevice();
    setIsTouch(isTouchDevice);
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      setIsVisible(true);

      const now = Date.now();
      const dt = Math.max(now - lastTimeRef.current, 1);
      const vx = (e.clientX - lastPosRef.current.x) / dt * 16;
      const vy = (e.clientY - lastPosRef.current.y) / dt * 16;

      velocityX.set(vx);
      velocityY.set(vy);

      lastPosRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = now;

      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const checkHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (!target || typeof target.closest !== "function") {
        setIsHovering(false);
        return;
      }

      const isInteractive =
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest("[data-magnetic]") ||
        target.closest(".glass-panel") ||
        target.closest(".card-3d-enhanced") ||
        target.closest("input") ||
        target.closest("textarea");

      setIsHovering(!!isInteractive);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousemove", checkHover, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.addEventListener("mouseleave", handleMouseLeave);
    document.body.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousemove", checkHover);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [mouseX, mouseY, velocityX, velocityY]);

  if (isTouch) return null;

  return (
    <>
      {/* Ambient glow - large flashlight effect */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[9900]"
        style={{
          opacity: isVisible ? 1 : 0,
          background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 138, 0, 0.06), transparent 40%)`,
        }}
      />

      {/* Medium glow orb */}
      <motion.div
        className="pointer-events-none fixed z-[9901] rounded-full"
        style={{
          width: isHovering ? 220 : 160,
          height: isHovering ? 220 : 160,
          left: glowX,
          top: glowY,
          x: "-50%",
          y: "-50%",
          opacity: isVisible ? (isHovering ? 0.6 : 0.35) : 0,
          background: isHovering
            ? "radial-gradient(circle, rgba(255, 138, 0, 0.22) 0%, rgba(0, 184, 169, 0.12) 40%, transparent 70%)"
            : "radial-gradient(circle, rgba(255, 138, 0, 0.15) 0%, rgba(0, 184, 169, 0.06) 50%, transparent 70%)",
          filter: "blur(35px)",
          transition: "width 0.4s ease, height 0.4s ease",
        }}
      />

      {/* Main Teardrop Shape */}
      <motion.div
        className="pointer-events-none fixed z-[9902] border"
        style={{
          width: isHovering ? 48 : isClicking ? 28 : 36,
          height: isHovering ? 48 : isClicking ? 28 : 36,
          left: ringX,
          top: ringY,
          x: "-50%",
          y: "-50%",
          // Rotation aligns the sharp corner (Top-Left) opposite to movement
          rotate: rotationAngle,
          // Border radius morphs from circle (50%) to teardrop (0 50 50 50)
          borderRadius: borderRadius,
          opacity: isVisible ? 0.9 : 0,
          borderColor: isHovering
            ? "rgba(255, 138, 0, 0.9)"
            : isClicking
              ? "rgba(0, 184, 169, 0.9)"
              : "rgba(255, 255, 255, 0.6)",
          borderWidth: isHovering ? 2 : 1,
          backgroundColor: isClicking
            ? "rgba(255, 138, 0, 0.15)"
            : isHovering
              ? "rgba(255, 138, 0, 0.06)"
              : "transparent",
          transition: "width 0.2s ease, height 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
        }}
      />

      {/* Inner cursor dot */}
      <motion.div
        className="pointer-events-none fixed z-[9903] rounded-full"
        style={{
          width: isHovering ? 10 : isClicking ? 10 : 6,
          height: isHovering ? 10 : isClicking ? 10 : 6,
          left: cursorX,
          top: cursorY,
          x: "-50%",
          y: "-50%",
          opacity: isVisible ? 1 : 0,
          backgroundColor: isHovering ? "#FF8A00" : isClicking ? "#00B8A9" : "#ffffff",
          boxShadow: isHovering
            ? "0 0 18px rgba(255, 138, 0, 0.8), 0 0 35px rgba(255, 138, 0, 0.3)"
            : isClicking
              ? "0 0 18px rgba(0, 184, 169, 0.8), 0 0 35px rgba(0, 184, 169, 0.3)"
              : "0 0 10px rgba(255, 255, 255, 0.5)",
          transition: "width 0.15s ease, height 0.15s ease, background-color 0.15s ease",
        }}
      />

      {/* CSS variables and cursor hide - only for devices with hover capability */}
      <style jsx global>{`
        :root {
          --mouse-x: 50%;
          --mouse-y: 50%;
        }
        /* Only hide cursor on devices that support hover (desktops with mouse) */
        @media (hover: hover) and (pointer: fine) {
          * {
            cursor: none !important;
          }
        }
      `}</style>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('mousemove', (e) => {
              document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
              document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
            });
          `,
        }}
      />
    </>
  );
}
