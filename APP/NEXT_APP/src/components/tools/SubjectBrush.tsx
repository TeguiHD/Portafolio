"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

/**
 * Pincel para marcar el sujeto sobre la imagen COMPLETA (no sobre el cropper:
 * así no pelea con sus gestos ni hay que mapear zoom y rotación).
 *
 * Los trazos se guardan normalizados (0..1) y se rasterizan bajo demanda a la
 * rejilla que pida el consumidor — la misma que usa la segmentación — para que
 * pincel y máscara coincidan píxel a píxel.
 */

export interface SubjectBrushHandle {
    getMask(gridWidth: number, gridHeight: number): Uint8Array | null;
    clear(): void;
    hasStrokes(): boolean;
}

interface SubjectBrushProps {
    imageSrc: string;
    /** Radio del pincel como fracción del ancho de la imagen. */
    brushSize: number;
    accentColor: string;
    onStrokesChange?: (hasStrokes: boolean) => void;
}

interface Point { x: number; y: number; r: number }
type Stroke = Point[];

function hexToRgba(hex: string, alpha: number): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return `rgba(255,255,255,${alpha})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const SubjectBrush = forwardRef<SubjectBrushHandle, SubjectBrushProps>(function SubjectBrush(
    { imageSrc, brushSize, accentColor, onStrokesChange },
    ref
) {
    const boxRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const drawingRef = useRef(false);
    const [frame, setFrame] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

    // Rectángulo que ocupa la imagen dentro del contenedor (object-contain).
    const measure = useCallback(() => {
        const box = boxRef.current;
        const img = imgRef.current;
        if (!box || !img || !img.naturalWidth) return;
        const bw = box.clientWidth, bh = box.clientHeight;
        const scale = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
        const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
        setFrame({ left: (bw - width) / 2, top: (bh - height) / 2, width, height });
    }, []);

    useEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const ro = new ResizeObserver(measure);
        ro.observe(box);
        return () => ro.disconnect();
    }, [measure]);

    const paint = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !frame) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(frame.width * dpr);
        canvas.height = Math.round(frame.height * dpr);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, frame.width, frame.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = hexToRgba(accentColor, 0.45);
        ctx.fillStyle = ctx.strokeStyle;
        for (const stroke of strokesRef.current) {
            if (stroke.length === 1) {
                const p = stroke[0];
                ctx.beginPath();
                ctx.arc(p.x * frame.width, p.y * frame.height, p.r * frame.width, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }
            ctx.lineWidth = stroke[0].r * 2 * frame.width;
            ctx.beginPath();
            stroke.forEach((p, i) => (i ? ctx.lineTo(p.x * frame.width, p.y * frame.height) : ctx.moveTo(p.x * frame.width, p.y * frame.height)));
            ctx.stroke();
        }
    }, [frame, accentColor]);

    useEffect(paint, [paint]);

    const toPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
            r: brushSize,
        };
    }, [brushSize]);

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const p = toPoint(e);
        if (!p) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drawingRef.current = true;
        strokesRef.current.push([p]);
        paint();
        onStrokesChange?.(true);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const p = toPoint(e);
        if (!p) return;
        strokesRef.current[strokesRef.current.length - 1].push(p);
        paint();
    };
    const onPointerUp = () => {
        drawingRef.current = false;
    };

    useImperativeHandle(ref, () => ({
        hasStrokes: () => strokesRef.current.length > 0,
        clear: () => {
            strokesRef.current = [];
            paint();
            onStrokesChange?.(false);
        },
        getMask: (gw, gh) => {
            if (strokesRef.current.length === 0) return null;
            const off = document.createElement("canvas");
            off.width = gw;
            off.height = gh;
            const ctx = off.getContext("2d", { willReadFrequently: true });
            if (!ctx) return null;
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#fff";
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (const stroke of strokesRef.current) {
                const rw = stroke[0].r * gw;
                if (stroke.length === 1) {
                    ctx.beginPath();
                    ctx.arc(stroke[0].x * gw, stroke[0].y * gh, rw, 0, Math.PI * 2);
                    ctx.fill();
                    continue;
                }
                ctx.lineWidth = rw * 2;
                ctx.beginPath();
                stroke.forEach((p, i) => (i ? ctx.lineTo(p.x * gw, p.y * gh) : ctx.moveTo(p.x * gw, p.y * gh)));
                ctx.stroke();
            }
            const data = ctx.getImageData(0, 0, gw, gh).data;
            const mask = new Uint8Array(gw * gh);
            for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
            return mask;
        },
    }), [paint, onStrokesChange]);

    return (
        <div ref={boxRef} className="relative h-full w-full select-none">
            <img ref={imgRef} src={imageSrc} alt="" onLoad={measure} draggable={false} className="pointer-events-none h-full w-full object-contain" />
            {frame && (
                <canvas
                    ref={canvasRef}
                    data-testid="subject-brush"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="absolute cursor-crosshair"
                    style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height, touchAction: "none" }}
                />
            )}
        </div>
    );
});
