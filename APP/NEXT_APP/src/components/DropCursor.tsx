"use client";

import { useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

export function DropCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTouch, setIsTouch] = useState(true); // Default to true to prevent flash
  const [isMounted, setIsMounted] = useState(false);

  // First effect: check mount and touch detection
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouch(isTouchDevice);
    setIsMounted(true);
  }, []);

  // Second effect: setup canvas only after mounted and not touch
  useEffect(() => {
    if (!isMounted || isTouch) return;
    if (typeof window === "undefined") return;

    // Force cursor: none on entire document
    document.documentElement.style.cursor = "none";
    document.body.style.cursor = "none";

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width: number;
    let height: number;
    const pixelRatio = window.devicePixelRatio || 1;
    let animationId: number;

    const config = {
      trailLength: 10,
      baseHeadRadius: 6,
      hoverHeadRadius: 10,
      clickScale: 0.8,
      strokeColor: "#F8FAFC",
      hoverColor: "#FF8A00",
      strokeWidth: 1.5,
      centerDotSize: 2.5,
      drag: 0.45,
      maxSegLength: 3.5,
    };

    const state = {
      mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      isHovering: false,
      isClicking: false,
      currentRadius: config.baseHeadRadius,
      smoothAngle: 0,
    };

    // Initialize trail
    const trail: Point[] = [];
    for (let i = 0; i < config.trailLength; i++) {
      trail.push({ x: state.mouse.x, y: state.mouse.y });
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * pixelRatio;
      canvas!.height = height * pixelRatio;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.scale(pixelRatio, pixelRatio);
    }

    function dist(p1: Point, p2: Point): number {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function lerp(start: number, end: number, factor: number): number {
      return start + (end - start) * factor;
    }

    function handleMouseMove(e: MouseEvent) {
      state.mouse.x = e.clientX;
      state.mouse.y = e.clientY;

      const target = e.target as HTMLElement;
      if (!target || typeof target.matches !== "function") {
        state.isHovering = false;
        return;
      }

      const isClickable =
        target.matches('a, button, input, textarea, [role="button"], .btn') ||
        target.closest("a") !== null ||
        target.closest("button") !== null ||
        target.closest("[data-magnetic]") !== null ||
        target.closest(".glass-panel") !== null ||
        target.closest(".card-3d-enhanced") !== null;

      state.isHovering = isClickable;
    }

    function handleMouseDown() {
      state.isClicking = true;
    }

    function handleMouseUp() {
      state.isClicking = false;
    }

    function animate() {
      animationId = requestAnimationFrame(animate);

      // --- 1. STATE ---
      let targetRadius = state.isHovering ? config.hoverHeadRadius : config.baseHeadRadius;
      if (state.isClicking) targetRadius *= config.clickScale;
      state.currentRadius = lerp(state.currentRadius, targetRadius, 0.2);

      // --- 2. PHYSICS ---
      const head = trail[0];

      // Smooth movement towards mouse
      head.x += (state.mouse.x - head.x) * 0.5;
      head.y += (state.mouse.y - head.y) * 0.5;

      // Body drag
      for (let i = 1; i < trail.length; i++) {
        const prev = trail[i - 1];
        const curr = trail[i];

        const vx = (prev.x - curr.x) * config.drag;
        const vy = (prev.y - curr.y) * config.drag;

        curr.x += vx;
        curr.y += vy;

        // Length constraint
        const d = dist(prev, curr);
        if (d > config.maxSegLength) {
          const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
          curr.x = prev.x + Math.cos(angle) * config.maxSegLength;
          curr.y = prev.y + Math.sin(angle) * config.maxSegLength;
        }
      }

      // --- 3. RENDERING ---
      ctx!.clearRect(0, 0, width, height);
      ctx!.strokeStyle = state.isHovering ? config.hoverColor : config.strokeColor;
      ctx!.lineWidth = config.strokeWidth;
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";
      ctx!.fillStyle = state.isHovering ? config.hoverColor : config.strokeColor;

      // --- REST CORRECTION ---
      const totalLength = dist(trail[0], trail[trail.length - 1]);

      if (totalLength < 5.0) {
        // Simple circle when at rest
        ctx!.beginPath();
        ctx!.arc(trail[0].x, trail[0].y, state.currentRadius, 0, Math.PI * 2);
        ctx!.stroke();

        ctx!.beginPath();
        const dotSize = state.isHovering ? config.centerDotSize * 1.5 : config.centerDotSize;
        ctx!.arc(trail[0].x, trail[0].y, dotSize, 0, Math.PI * 2);
        ctx!.fill();

        state.smoothAngle = 0;
        return;
      }

      // --- POINT CALCULATION ---
      const leftPoints: Point[] = [];
      const rightPoints: Point[] = [];

      // Calculate head angle based on first 2 points
      const dx = trail[1].x - trail[0].x;
      const dy = trail[1].y - trail[0].y;
      const headAngle = Math.atan2(dy, dx);

      for (let i = 0; i < trail.length; i++) {
        const progress = i / (trail.length - 1);
        const radius = state.currentRadius * (1 - progress * 0.9);
        const pCurr = trail[i];
        let angle: number;

        if (i === 0) {
          angle = headAngle;
        } else {
          const pPrev = trail[i - 1];
          const pNext = trail[i + 1] || pCurr;

          if (i === trail.length - 1) {
            angle = Math.atan2(pCurr.y - pPrev.y, pCurr.x - pPrev.x);
          } else {
            const a1 = Math.atan2(pNext.y - pCurr.y, pNext.x - pCurr.x);
            const a2 = Math.atan2(pCurr.y - pPrev.y, pCurr.x - pPrev.x);
            angle = Math.atan2(Math.sin(a1) + Math.sin(a2), Math.cos(a1) + Math.cos(a2));
          }
        }

        const offX = Math.cos(angle + Math.PI / 2) * radius;
        const offY = Math.sin(angle + Math.PI / 2) * radius;

        rightPoints.push({ x: pCurr.x + offX, y: pCurr.y + offY });
        leftPoints.push({ x: pCurr.x - offX, y: pCurr.y - offY });
      }

      ctx!.beginPath();

      // --- DRAWING (exactly like original HTML) ---

      // 1. Start at left side of head
      ctx!.moveTo(leftPoints[0].x, leftPoints[0].y);

      // 2. Curve to tail on left side
      for (let i = 1; i < leftPoints.length - 1; i++) {
        const xc = (leftPoints[i].x + leftPoints[i + 1].x) / 2;
        const yc = (leftPoints[i].y + leftPoints[i + 1].y) / 2;
        ctx!.quadraticCurveTo(leftPoints[i].x, leftPoints[i].y, xc, yc);
      }
      ctx!.quadraticCurveTo(
        leftPoints[leftPoints.length - 1].x,
        leftPoints[leftPoints.length - 1].y,
        leftPoints[leftPoints.length - 1].x,
        leftPoints[leftPoints.length - 1].y
      );

      // 3. Tail tip
      ctx!.arc(
        trail[trail.length - 1].x,
        trail[trail.length - 1].y,
        state.currentRadius * 0.1,
        0,
        Math.PI * 2
      );

      // 4. Return on right side
      ctx!.lineTo(rightPoints[rightPoints.length - 1].x, rightPoints[rightPoints.length - 1].y);

      for (let i = rightPoints.length - 2; i >= 1; i--) {
        const xc = (rightPoints[i].x + rightPoints[i - 1].x) / 2;
        const yc = (rightPoints[i].y + rightPoints[i - 1].y) / 2;
        ctx!.quadraticCurveTo(rightPoints[i].x, rightPoints[i].y, xc, yc);
      }
      ctx!.quadraticCurveTo(rightPoints[0].x, rightPoints[0].y, rightPoints[0].x, rightPoints[0].y);

      // 5. CIERRE DE LA CABEZA (ADAPTATIVO)
      // Cerramos desde rightPoints[0] hasta leftPoints[0] pasando por el "frente".
      // Ángulo de RightPoint[0] = headAngle + PI/2
      // Ángulo de LeftPoint[0] = headAngle - PI/2
      // false = sentido horario (el camino largo por el frente)
      ctx!.arc(
        trail[0].x,
        trail[0].y,
        state.currentRadius,
        headAngle + Math.PI / 2,
        headAngle - Math.PI / 2,
        false
      );

      ctx!.stroke();

      // Center dot
      ctx!.beginPath();
      const dotSize = state.isHovering ? config.centerDotSize * 1.5 : config.centerDotSize;
      ctx!.arc(trail[0].x, trail[0].y, dotSize, 0, Math.PI * 2);
      ctx!.fill();
    }

    // Initialize
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // Start animation
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";
    };
  }, [isMounted, isTouch]);

  // Don't render on touch devices or during SSR
  if (!isMounted || isTouch) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 99999, // Reduced from 999999 to not cover Next.js dev tools
        pointerEvents: "none",
      }}
    />
  );
}

export default DropCursor;
