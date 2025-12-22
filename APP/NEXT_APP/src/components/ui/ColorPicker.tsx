"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
    className?: string;
}

// Helper to convert Hex to HSV and back
const hexToHsv = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToHex = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s / 100);
    const q = v * (1 - f * s / 100);
    const t = v * (1 - (1 - f) * s / 100);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    const toHex = (x: number) => {
        const hex = Math.round(x * 2.55).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return "#" + toHex(r) + toHex(g) + toHex(b);
};

export function ColorPicker({ color, onChange, label, className = "" }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hsv, setHsv] = useState(hexToHsv(color));

    // Update internal state when prop changes externally (e.g. presets)
    useEffect(() => {
        setHsv(hexToHsv(color));
    }, [color]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSaturationChange = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        const newS = x * 100;
        const newV = 100 - (y * 100);

        setHsv(prev => {
            const newHsv = { ...prev, s: newS, v: newV };
            onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
            return newHsv;
        });
    };

    const handleHueChange = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

        const newH = x * 360;

        setHsv(prev => {
            const newHsv = { ...prev, h: newH };
            onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
            return newHsv;
        });
    };

    // Mouse move handlers for drag
    const handleSatMove = (e: any) => { if (e.buttons === 1 || e.touches) handleSaturationChange(e); };
    const handleHueMove = (e: any) => { if (e.buttons === 1 || e.touches) handleHueChange(e); };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="text-xs text-neutral-400 mb-2 block">{label}</label>}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full p-1.5 rounded-lg border border-white/10 bg-[#0F1724] hover:bg-white/5 transition-colors"
            >
                <div
                    className="w-8 h-8 rounded-md border border-white/10 shadow-inner"
                    style={{ backgroundColor: color }}
                />
                <span className="flex-1 text-left text-sm text-white font-mono uppercase">
                    {color}
                </span>
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-full left-0 z-50 mt-2 w-64 p-4 rounded-xl border border-white/10 bg-[#1E293B]/95 backdrop-blur-xl shadow-2xl"
                    >
                        {/* Saturation/Brightness Box */}
                        <div
                            className="w-full h-40 rounded-lg mb-4 relative cursor-crosshair touch-none"
                            style={{
                                backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                                backgroundImage: `
                                    linear-gradient(to bottom, transparent, #000),
                                    linear-gradient(to right, #fff, transparent)
                                `
                            }}
                            onMouseDown={handleSaturationChange}
                            onMouseMove={handleSatMove}
                            onTouchStart={handleSaturationChange}
                            onTouchMove={handleSatMove}
                        >
                            <div
                                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                style={{
                                    left: `${hsv.s}%`,
                                    top: `${100 - hsv.v}%`,
                                    backgroundColor: color
                                }}
                            />
                        </div>

                        {/* Hue Slider */}
                        <div
                            className="w-full h-4 rounded-full mb-4 relative cursor-pointer touch-none"
                            style={{
                                background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
                            }}
                            onMouseDown={handleHueChange}
                            onMouseMove={handleHueMove}
                            onTouchStart={handleHueChange}
                            onTouchMove={handleHueMove}
                        >
                            <div
                                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none bg-white"
                                style={{ left: `${(hsv.h / 360) * 100}%` }}
                            />
                        </div>

                        {/* Hex Input */}
                        <div className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-md border border-white/10 shadow-inner shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">#</span>
                                <input
                                    type="text"
                                    value={color.replace("#", "")}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^[0-9A-Fa-f]{0,6}$/.test(val)) {
                                            if (val.length === 6) {
                                                onChange("#" + val);
                                                setHsv(hexToHsv("#" + val));
                                            } else {
                                                // Just update prop or keep internal? internal hex state needed if typing
                                                // Simplified: only trigger change on valid hex, but let user type
                                            }
                                        }
                                    }}
                                    className="w-full pl-6 pr-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-accent-1/50 uppercase"
                                    maxLength={6}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
