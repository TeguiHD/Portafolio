"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface SelectOption {
    value: string;
    label: string;
    preview?: string; // For font preview
}

interface CustomSelectProps {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
}

export function CustomSelect({
    value,
    options,
    onChange,
    label,
    placeholder = "Seleccionar..."
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Detect mobile/tablet
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClick = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            ) return;
            setIsOpen(false);
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [isOpen]);

    const handleSelect = (opt: SelectOption) => {
        onChange(opt.value);
        setIsOpen(false);
    };

    // Desktop dropdown content
    const DropdownContent = () => (
        <div
            ref={dropdownRef}
            className="py-1 bg-neutral-900 border border-white/20 rounded-xl shadow-2xl min-w-[200px] max-h-[300px] overflow-y-auto"
        >
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between ${opt.value === value
                            ? "bg-accent-1/20 text-accent-1"
                            : "text-white hover:bg-white/10"
                        }`}
                    style={opt.preview ? { fontFamily: opt.preview } : undefined}
                >
                    <span>{opt.label}</span>
                    {opt.value === value && (
                        <svg className="w-4 h-4 text-accent-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
            ))}
        </div>
    );

    // Mobile bottom sheet content
    const MobileSheet = () => (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Bottom Sheet */}
            <motion.div
                ref={dropdownRef}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-neutral-900 rounded-t-3xl z-50 max-h-[70vh] overflow-hidden"
            >
                {/* Handle bar */}
                <div className="flex justify-center py-3">
                    <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-3 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">{label || "Seleccionar"}</h3>
                </div>

                {/* Options */}
                <div className="overflow-y-auto max-h-[calc(70vh-100px)] pb-safe">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt)}
                            className={`w-full px-5 py-4 text-left transition-colors flex items-center justify-between border-b border-white/5 ${opt.value === value
                                    ? "bg-accent-1/10"
                                    : "active:bg-white/10"
                                }`}
                            style={opt.preview ? { fontFamily: opt.preview } : undefined}
                        >
                            <span className={`text-base ${opt.value === value ? "text-accent-1 font-medium" : "text-white"}`}>
                                {opt.label}
                            </span>
                            {opt.value === value && (
                                <div className="w-6 h-6 rounded-full bg-accent-1 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Cancel button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-full py-3 rounded-xl bg-white/10 text-white font-medium active:bg-white/20"
                    >
                        Cancelar
                    </button>
                </div>
            </motion.div>
        </>
    );

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-left flex items-center justify-between hover:border-white/20 transition-colors"
            >
                <span
                    className={selectedOption ? "text-white" : "text-neutral-400"}
                    style={selectedOption?.preview ? { fontFamily: selectedOption.preview } : undefined}
                >
                    {selectedOption?.label || placeholder}
                </span>
                <svg
                    className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown/Sheet */}
            <AnimatePresence>
                {isOpen && (
                    isMobile ? (
                        createPortal(<MobileSheet />, document.body)
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 z-50"
                        >
                            <DropdownContent />
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>
    );
}
