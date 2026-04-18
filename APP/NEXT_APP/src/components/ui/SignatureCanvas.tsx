"use client";

/**
 * Digital Signature Canvas Component
 * 
 * Supports touch and mouse input for drawing signatures.
 * Exports as base64 PNG data URI for storage in ClientApproval.signatureImage
 * 
 * Features:
 * - Smooth drawing with quadratic Bézier curves
 * - Touch-optimized (prevents scroll while drawing)
 * - Responsive (fills container width)
 * - Clear / Undo support
 * - Dynamic line width based on speed (pressure simulation)
 */

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

export interface SignatureCanvasRef {
    toDataURL: () => string | null;
    clear: () => void;
    isEmpty: () => boolean;
}

interface SignatureCanvasProps {
    width?: number;
    height?: number;
    penColor?: string;
    penWidth?: number;
    backgroundColor?: string;
    className?: string;
    onEnd?: () => void;
    onChange?: (isEmpty: boolean) => void;
    disabled?: boolean;
}

interface Point {
    x: number;
    y: number;
    time: number;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
    (
        {
            height = 200,
            penColor = "#ffffff",
            penWidth = 2.5,
            backgroundColor = "transparent",
            className = "",
            onEnd,
            onChange,
            disabled = false,
        },
        ref
    ) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [hasContent, setHasContent] = useState(false);
        const pointsRef = useRef<Point[]>([]);

        // Resize canvas to match display size
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const resizeObserver = new ResizeObserver(() => {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvas.width = rect.width * dpr;
                canvas.height = height * dpr;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    // Restore background after resize
                    if (backgroundColor !== "transparent") {
                        ctx.fillStyle = backgroundColor;
                        ctx.fillRect(0, 0, rect.width, height);
                    }
                }
            });

            resizeObserver.observe(canvas);
            return () => resizeObserver.disconnect();
        }, [height, backgroundColor]);

        const getPoint = useCallback(
            (e: React.MouseEvent | React.TouchEvent): Point | null => {
                const canvas = canvasRef.current;
                if (!canvas) return null;
                const rect = canvas.getBoundingClientRect();

                let clientX: number, clientY: number;
                if ("touches" in e) {
                    if (e.touches.length === 0) return null;
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top,
                    time: Date.now(),
                };
            },
            []
        );

        const getLineWidth = useCallback(
            (p1: Point, p2: Point): number => {
                const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
                const dt = Math.max(p2.time - p1.time, 1);
                const speed = dist / dt;

                // Faster movement = thinner line (simulate pen pressure)
                const minWidth = penWidth * 0.5;
                const maxWidth = penWidth * 2;
                const width = maxWidth - (maxWidth - minWidth) * Math.min(speed / 8, 1);
                return width;
            },
            [penWidth]
        );

        const drawSegment = useCallback(
            (ctx: CanvasRenderingContext2D, points: Point[]) => {
                if (points.length < 2) return;

                ctx.strokeStyle = penColor;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                if (points.length === 2) {
                    // Simple line for 2 points
                    ctx.beginPath();
                    ctx.lineWidth = getLineWidth(points[0], points[1]);
                    ctx.moveTo(points[0].x, points[0].y);
                    ctx.lineTo(points[1].x, points[1].y);
                    ctx.stroke();
                    return;
                }

                // Draw smooth curve through last 3+ points using quadratic Bézier
                const last = points.length - 1;
                const p0 = points[last - 2];
                const p1 = points[last - 1];
                const p2 = points[last];

                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                ctx.beginPath();
                ctx.lineWidth = getLineWidth(p1, p2);
                ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
                ctx.stroke();
            },
            [penColor, getLineWidth]
        );

        const handleStart = useCallback(
            (e: React.MouseEvent | React.TouchEvent) => {
                if (disabled) return;
                e.preventDefault();
                const point = getPoint(e);
                if (!point) return;

                setIsDrawing(true);
                pointsRef.current = [point];

                const ctx = canvasRef.current?.getContext("2d");
                if (ctx) {
                    // Draw a dot for single-tap
                    ctx.fillStyle = penColor;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, penWidth / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            },
            [disabled, getPoint, penColor, penWidth]
        );

        const handleMove = useCallback(
            (e: React.MouseEvent | React.TouchEvent) => {
                if (!isDrawing || disabled) return;
                e.preventDefault();

                const point = getPoint(e);
                if (!point) return;

                pointsRef.current.push(point);

                const ctx = canvasRef.current?.getContext("2d");
                if (ctx) {
                    drawSegment(ctx, pointsRef.current);
                }

                if (!hasContent) {
                    setHasContent(true);
                    onChange?.(false);
                }
            },
            [isDrawing, disabled, getPoint, drawSegment, hasContent, onChange]
        );

        const handleEnd = useCallback(() => {
            if (!isDrawing) return;
            setIsDrawing(false);
            pointsRef.current = [];
            onEnd?.();
        }, [isDrawing, onEnd]);

        const clear = useCallback(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            if (backgroundColor !== "transparent") {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            }

            setHasContent(false);
            onChange?.(true);
        }, [backgroundColor, onChange]);

        const toDataURL = useCallback((): string | null => {
            if (!hasContent) return null;
            return canvasRef.current?.toDataURL("image/png") ?? null;
        }, [hasContent]);

        const isEmpty = useCallback(() => !hasContent, [hasContent]);

        useImperativeHandle(ref, () => ({ toDataURL, clear, isEmpty }), [toDataURL, clear, isEmpty]);

        return (
            <div className={`relative ${className}`}>
                <canvas
                    ref={canvasRef}
                    style={{ width: "100%", height: `${height}px` }}
                    className={`rounded-xl border-2 border-dashed transition-colors touch-none ${
                        disabled
                            ? "border-white/5 cursor-not-allowed opacity-40"
                            : isDrawing
                            ? "border-accent-1/50 bg-white/[0.03]"
                            : hasContent
                            ? "border-accent-1/30 bg-white/[0.02]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                />

                {!hasContent && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-sm text-neutral-500 select-none">
                            Dibuje su firma aquí
                        </p>
                    </div>
                )}

                {hasContent && !disabled && (
                    <button
                        onClick={clear}
                        type="button"
                        className="absolute top-2 right-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 text-neutral-300 hover:bg-red-500/20 hover:text-red-300 transition-all border border-white/5"
                    >
                        Limpiar
                    </button>
                )}
            </div>
        );
    }
);

SignatureCanvas.displayName = "SignatureCanvas";
export default SignatureCanvas;
