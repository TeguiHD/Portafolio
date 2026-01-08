/**
 * ValidatedFormField Component
 * Form field with inline validation feedback
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";

interface ValidatedInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    schema?: z.ZodSchema;
    placeholder?: string;
    type?: "text" | "email" | "tel" | "url";
    maxLength?: number;
    required?: boolean;
    hint?: string;
    className?: string;
    debounceMs?: number;
}

export function ValidatedInput({
    label,
    value,
    onChange,
    schema,
    placeholder,
    type = "text",
    maxLength,
    required = false,
    hint,
    className = "",
    debounceMs = 300,
}: ValidatedInputProps) {
    const [error, setError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const validate = useCallback((val: string) => {
        if (!schema) return;

        setIsValidating(true);
        const result = schema.safeParse(val);

        if (!result.success) {
            setError(result.error.issues[0]?.message || "Valor inválido");
        } else {
            setError(null);
        }
        setIsValidating(false);
    }, [schema]);

    // Debounced validation
    useEffect(() => {
        if (!touched) return;

        const timer = setTimeout(() => {
            validate(value);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, touched, validate, debounceMs]);

    const handleBlur = () => {
        setTouched(true);
        validate(value);
    };

    const hasError = touched && error;
    const isValid = touched && !error && value.length > 0;

    return (
        <div className={className}>
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                {label}
                {required && <span className="text-red-400">*</span>}
                {maxLength && (
                    <span className="text-neutral-500 ml-auto text-xs">
                        {value.length}/{maxLength}
                    </span>
                )}
            </label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border text-white focus:outline-none transition-colors ${hasError
                            ? "border-red-500/50 focus:border-red-500"
                            : isValid
                                ? "border-green-500/30 focus:border-green-500/50"
                                : "border-accent-1/20 focus:border-accent-1/50"
                        }`}
                />

                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AnimatePresence mode="wait">
                        {isValidating && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="w-4 h-4 border-2 border-neutral-500 border-t-accent-1 rounded-full animate-spin"
                            />
                        )}
                        {!isValidating && hasError && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="text-red-400"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </motion.div>
                        )}
                        {!isValidating && isValid && (
                            <motion.div
                                key="valid"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="text-green-400"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Error/hint message */}
            <AnimatePresence>
                {hasError && (
                    <motion.p
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </motion.p>
                )}
                {!hasError && hint && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-neutral-500 text-xs mt-1.5"
                    >
                        {hint}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}

interface ValidatedTextareaProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    schema?: z.ZodSchema;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
    required?: boolean;
    hint?: string;
    className?: string;
}

export function ValidatedTextarea({
    label,
    value,
    onChange,
    schema,
    placeholder,
    rows = 4,
    maxLength,
    required = false,
    hint,
    className = "",
}: ValidatedTextareaProps) {
    const [error, setError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);

    const validate = useCallback((val: string) => {
        if (!schema) return;
        const result = schema.safeParse(val);
        setError(result.success ? null : (result.error.issues[0]?.message || "Valor inválido"));
    }, [schema]);

    const handleBlur = () => {
        setTouched(true);
        validate(value);
    };

    const hasError = touched && error;
    const isValid = touched && !error && value.length > 0;

    return (
        <div className={className}>
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                {label}
                {required && <span className="text-red-400">*</span>}
                {maxLength && (
                    <span className={`ml-auto text-xs ${value.length > maxLength * 0.9
                            ? value.length >= maxLength
                                ? "text-red-400"
                                : "text-yellow-400"
                            : "text-neutral-500"
                        }`}>
                        {value.length}/{maxLength}
                    </span>
                )}
            </label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={handleBlur}
                placeholder={placeholder}
                rows={rows}
                maxLength={maxLength}
                className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border text-white focus:outline-none resize-none transition-colors ${hasError
                        ? "border-red-500/50 focus:border-red-500"
                        : isValid
                            ? "border-green-500/30 focus:border-green-500/50"
                            : "border-accent-1/20 focus:border-accent-1/50"
                    }`}
            />

            <AnimatePresence>
                {hasError && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-red-400 text-xs mt-1.5 flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </motion.p>
                )}
                {!hasError && hint && (
                    <motion.p className="text-neutral-500 text-xs mt-1.5">
                        {hint}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
