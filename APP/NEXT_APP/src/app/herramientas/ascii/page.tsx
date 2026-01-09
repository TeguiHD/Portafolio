"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useDebounce";
import { useToolAccess } from "@/hooks/useToolAccess";

// Character sets for ASCII art conversion
const ASCII_CHAR_SETS = {
    standard: " .:-=+*#%@",
    detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    blocks: " ░▒▓█",
    simple: " .oO@",
    binary: "01",
    custom: "",
};

type CharSetKey = keyof typeof ASCII_CHAR_SETS;
type SpaceDensity = "compact" | "normal" | "sparse";
type AsciiGradient = "dark-to-light" | "light-to-dark";

interface AsciiSettings {
    width: number;
    charSet: CharSetKey;
    customChars: string;
    inverted: boolean;
    colored: boolean;
    preserveAspect: boolean;
    // Enhanced settings
    brightness: number;      // -100 to 100
    contrast: number;        // -100 to 100
    saturation: number;      // -100 to 100
    hue: number;            // 0 to 360
    grayscale: boolean;
    sepia: boolean;
    asciiGradient: AsciiGradient;
    spaceDensity: SpaceDensity;
    transparentFrame: boolean;
    qualityEnhancements: boolean;
}

const DEFAULT_SETTINGS: AsciiSettings = {
    width: 80,
    charSet: "standard",
    customChars: "",
    inverted: false,
    colored: false,
    preserveAspect: true,
    // Enhanced defaults
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    grayscale: false,
    sepia: false,
    asciiGradient: "dark-to-light",
    spaceDensity: "normal",
    transparentFrame: false,
    qualityEnhancements: false,
};

// Preset configurations
const PRESETS = [
    { name: "Estándar", width: 80, charSet: "standard" as CharSetKey },
    { name: "HD", width: 120, charSet: "detailed" as CharSetKey },
    { name: "Retro", width: 60, charSet: "blocks" as CharSetKey },
    { name: "Minimal", width: 50, charSet: "simple" as CharSetKey },
];

// Icons
const UploadIcon = () => (
    <svg className="w-16 h-16 sm:w-20 sm:h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const CopyIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const RefreshIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const ImageIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const TerminalIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ZoomInIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
);

const ColorIcon = ({ filled = false }: { filled?: boolean }) => (
    <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
);

const InvertIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
);

import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

export default function AsciiArtPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("ascii");
    const { trackImmediate } = useToolTracking("ascii", { trackViewOnMount: true });

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [asciiArt, setAsciiArt] = useState<string>("");
    const [coloredAscii, setColoredAscii] = useState<{ char: string; color: string }[][]>([]);
    const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
    const [copied, setCopied] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
    const [activeView, setActiveView] = useState<"original" | "ascii">("ascii");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [fontSize, setFontSize] = useState(6);
    const [rateLimitError, setRateLimitError] = useState<string | null>(null);
    const [charSetDropdownOpen, setCharSetDropdownOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const outputRef = useRef<HTMLPreElement>(null);

    // ==========================================
    // SECURITY: Rate Limiting & Logging
    // ==========================================

    const RATE_LIMIT_KEY = "ascii_art_uploads";
    const SECURITY_LOG_KEY = "ascii_art_security_log";
    const MAX_UPLOADS_PER_MINUTE = 10;
    const MAX_UPLOADS_PER_HOUR = 50;
    const SUSPICIOUS_THRESHOLD = 3; // Failed validations before flagging

    interface RateLimitEntry {
        timestamps: number[];
        failedAttempts: number;
        lastFailedType?: string;
    }

    interface SecurityLogEntry {
        timestamp: number;
        event: string;
        details: string;
        severity: "info" | "warning" | "critical";
    }

    // Get or initialize rate limit data from sessionStorage
    const getRateLimitData = (): RateLimitEntry => {
        try {
            const data = sessionStorage.getItem(RATE_LIMIT_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch {
            // Ignore parse errors
        }
        return { timestamps: [], failedAttempts: 0 };
    };

    // Save rate limit data
    const saveRateLimitData = (data: RateLimitEntry) => {
        try {
            sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
        } catch {
            // Ignore storage errors
        }
    };

    // Log security event
    const logSecurityEvent = (event: string, details: string, severity: SecurityLogEntry["severity"] = "info") => {
        try {
            const logs: SecurityLogEntry[] = JSON.parse(sessionStorage.getItem(SECURITY_LOG_KEY) || "[]");
            logs.push({
                timestamp: Date.now(),
                event,
                details,
                severity,
            });
            // Keep only last 100 entries
            if (logs.length > 100) {
                logs.shift();
            }
            sessionStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(logs));

            // Also log to console in development
            if (process.env.NODE_ENV === "development") {
                const colors = { info: "\x1b[34m", warning: "\x1b[33m", critical: "\x1b[31m" };
                console.log(`${colors[severity]}[SECURITY ${severity.toUpperCase()}]\x1b[0m ${event}: ${details}`);
            }

            // Report critical events to server
            if (severity === "critical") {
                reportSecurityIncident(event, details);
            }
        } catch {
            // Ignore logging errors
        }
    };

    // Report security incident to server (async, non-blocking)
    const reportSecurityIncident = async (event: string, details: string) => {
        try {
            await fetch("/api/tools/public/ascii", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "security_incident",
                    metadata: {
                        event,
                        details,
                        userAgent: navigator.userAgent,
                        timestamp: new Date().toISOString(),
                    },
                }),
            });
        } catch {
            // Silently fail - don't block user experience
        }
    };

    // Check rate limit before processing
    const checkRateLimit = (): boolean => {
        const now = Date.now();
        const data = getRateLimitData();

        // Clean old timestamps (older than 1 hour)
        const oneHourAgo = now - 60 * 60 * 1000;
        const oneMinuteAgo = now - 60 * 1000;

        data.timestamps = data.timestamps.filter(t => t > oneHourAgo);

        // Count recent uploads
        const uploadsLastMinute = data.timestamps.filter(t => t > oneMinuteAgo).length;
        const uploadsLastHour = data.timestamps.length;

        // Check per-minute limit
        if (uploadsLastMinute >= MAX_UPLOADS_PER_MINUTE) {
            const waitTime = Math.ceil((data.timestamps.find(t => t > oneMinuteAgo)! + 60000 - now) / 1000);
            setRateLimitError(`Demasiados intentos. Espera ${waitTime} segundos.`);
            logSecurityEvent("rate_limit_minute", `${uploadsLastMinute} uploads in last minute`, "warning");
            return false;
        }

        // Check per-hour limit
        if (uploadsLastHour >= MAX_UPLOADS_PER_HOUR) {
            setRateLimitError("Límite por hora alcanzado. Intenta más tarde.");
            logSecurityEvent("rate_limit_hour", `${uploadsLastHour} uploads in last hour`, "warning");
            return false;
        }

        // Check for suspicious behavior (multiple failed attempts)
        if (data.failedAttempts >= SUSPICIOUS_THRESHOLD) {
            logSecurityEvent("suspicious_activity", `${data.failedAttempts} failed attempts, last type: ${data.lastFailedType}`, "critical");
            // Don't block, but flag for monitoring
        }

        setRateLimitError(null);
        return true;
    };

    // Record successful upload
    const recordUpload = () => {
        const data = getRateLimitData();
        data.timestamps.push(Date.now());
        data.failedAttempts = 0; // Reset on success
        saveRateLimitData(data);
        logSecurityEvent("upload_success", `File processed successfully`, "info");
    };

    // Record failed validation
    const recordFailedValidation = (reason: string) => {
        const data = getRateLimitData();
        data.failedAttempts++;
        data.lastFailedType = reason;
        saveRateLimitData(data);
        logSecurityEvent("validation_failed", reason, data.failedAttempts >= SUSPICIOUS_THRESHOLD ? "warning" : "info");
    };

    // ==========================================
    // SECURITY: File Validation
    // ==========================================

    // Magic bytes signatures for image formats
    const MAGIC_BYTES: Record<string, number[][]> = {
        "image/jpeg": [[0xFF, 0xD8, 0xFF]],
        "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        "image/gif": [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
        "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF)
        "image/bmp": [[0x42, 0x4D]], // BM
    };

    // Verify magic bytes match claimed MIME type
    const verifyMagicBytes = async (file: File, claimedType: string): Promise<boolean> => {
        const signatures = MAGIC_BYTES[claimedType];
        if (!signatures) return false;

        const headerBytes = await file.slice(0, 12).arrayBuffer();
        const header = new Uint8Array(headerBytes);

        return signatures.some(signature =>
            signature.every((byte, index) => header[index] === byte)
        );
    };

    // Validate image dimensions to prevent memory DoS
    const validateImageDimensions = (img: HTMLImageElement): boolean => {
        const MAX_DIMENSION = 8000; // Max 8000x8000 pixels
        const MAX_TOTAL_PIXELS = 25_000_000; // 25 megapixels max

        if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
            alert(`Imagen demasiado grande. Máximo ${MAX_DIMENSION}x${MAX_DIMENSION} píxeles.`);
            return false;
        }

        if (img.width * img.height > MAX_TOTAL_PIXELS) {
            alert(`Imagen con demasiados píxeles. Máximo ${MAX_TOTAL_PIXELS / 1_000_000}MP.`);
            return false;
        }

        return true;
    };

    // Sanitize filename to prevent XSS
    const sanitizeFilename = (name: string): string => {
        return name
            .replace(/[<>"'&]/g, '') // Remove HTML special chars
            .replace(/[^\w\s.-]/g, '_') // Replace non-safe chars
            .substring(0, 100); // Limit length
    };

    // Sanitize custom characters for HTML output
    const sanitizeChars = (chars: string): string => {
        return chars
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    // Main file validation with security checks
    const validateFile = async (file: File): Promise<boolean> => {
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
        const maxSize = 10 * 1024 * 1024; // 10MB

        // 0. Check rate limit first
        if (!checkRateLimit()) {
            return false;
        }

        // 1. Check MIME type (basic)
        if (!validTypes.includes(file.type)) {
            recordFailedValidation(`invalid_mime_type: ${file.type}`);
            alert("Formato de imagen no soportado. Use: JPG, PNG, GIF, WebP o BMP.");
            return false;
        }

        // 2. Check file size
        if (file.size > maxSize) {
            recordFailedValidation(`file_too_large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            alert("La imagen es demasiado grande. Máximo: 10MB.");
            return false;
        }

        // 3. Verify magic bytes match claimed type (prevents MIME spoofing)
        const validMagic = await verifyMagicBytes(file, file.type);
        if (!validMagic) {
            recordFailedValidation(`magic_bytes_mismatch: claimed ${file.type}`);
            alert("El archivo no parece ser una imagen válida. Posible archivo corrupto o manipulado.");
            return false;
        }

        // Log successful validation
        logSecurityEvent("file_validated", `${file.type}, ${(file.size / 1024).toFixed(1)}KB`, "info");
        return true;
    };

    // Convert image to ASCII
    const convertToAscii = useCallback((img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        setProcessing(true);

        const aspectRatio = img.height / img.width;
        const charAspect = 0.5;

        const width = settings.width;
        const height = settings.preserveAspect
            ? Math.round(width * aspectRatio * charAspect)
            : Math.round(width * 0.5);

        canvas.width = width;
        canvas.height = height;

        // Apply CSS filters for brightness, contrast, saturation, hue, grayscale, sepia
        const brightnessVal = (100 + settings.brightness) / 100; // 0 to 2
        const contrastVal = (100 + settings.contrast) / 100; // 0 to 2
        const saturateVal = (100 + settings.saturation) / 100; // 0 to 2
        const hueVal = settings.hue;

        let filterStr = `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturateVal}) hue-rotate(${hueVal}deg)`;
        if (settings.grayscale) filterStr += ' grayscale(100%)';
        if (settings.sepia) filterStr += ' sepia(100%)';

        ctx.filter = filterStr;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.filter = 'none';

        // Apply quality enhancements (simple edge sharpening using Laplacian-like convolution)
        if (settings.qualityEnhancements) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // Sharpen kernel
            const output = new Uint8ClampedArray(data.length);

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    for (let c = 0; c < 3; c++) { // RGB channels
                        let sum = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                                sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                        output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
                    }
                    output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]; // Alpha
                }
            }

            // Copy edge pixels
            for (let x = 0; x < width; x++) {
                for (let c = 0; c < 4; c++) {
                    output[x * 4 + c] = data[x * 4 + c];
                    output[((height - 1) * width + x) * 4 + c] = data[((height - 1) * width + x) * 4 + c];
                }
            }
            for (let y = 0; y < height; y++) {
                for (let c = 0; c < 4; c++) {
                    output[(y * width) * 4 + c] = data[(y * width) * 4 + c];
                    output[(y * width + width - 1) * 4 + c] = data[(y * width + width - 1) * 4 + c];
                }
            }

            imageData.data.set(output);
            ctx.putImageData(imageData, 0, 0);
        }

        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        let chars = ASCII_CHAR_SETS[settings.charSet];
        if (settings.charSet === "custom" && settings.customChars.length > 0) {
            chars = settings.customChars;
        }
        if (chars.length === 0) chars = ASCII_CHAR_SETS.standard;

        // Handle ASCII gradient direction
        let charArray = chars.split("");
        if (settings.asciiGradient === "light-to-dark") {
            charArray = charArray.reverse();
        }
        // Then apply inverted if needed
        if (settings.inverted) {
            charArray = charArray.reverse();
        }

        // Space density character mapping
        const getSpacedChar = (char: string): string => {
            if (settings.spaceDensity === "compact") {
                return char; // No spacing
            } else if (settings.spaceDensity === "sparse") {
                return char + " "; // Extra space
            }
            return char; // Normal
        };

        const lines: string[] = [];
        const colorLines: { char: string; color: string }[][] = [];

        for (let y = 0; y < height; y++) {
            let line = "";
            const colorLine: { char: string; color: string }[] = [];

            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];

                const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const charIndex = Math.floor(brightness * (charArray.length - 1));
                const char = charArray[Math.min(charIndex, charArray.length - 1)];
                const spacedChar = getSpacedChar(char);

                line += spacedChar;
                colorLine.push({ char: spacedChar, color: `rgb(${r},${g},${b})` });
            }
            lines.push(line);
            colorLines.push(colorLine);
        }

        setAsciiArt(lines.join("\n"));
        setColoredAscii(colorLines);
        setProcessing(false);
    }, [settings]);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Async validation with magic bytes check
        const isValid = await validateFile(file);
        if (!isValid) return;

        setFileName(sanitizeFilename(file.name));

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setImageUrl(dataUrl);

            const img = new Image();
            img.onload = () => {
                // Validate dimensions before processing
                if (!validateImageDimensions(img)) {
                    recordFailedValidation(`dimensions_exceeded: ${img.width}x${img.height}`);
                    setImageUrl(null);
                    return;
                }
                setImageSize({ width: img.width, height: img.height });
                recordUpload(); // Record successful upload
                convertToAscii(img);
            };
            img.onerror = () => {
                recordFailedValidation("image_load_error");
                alert("Error al cargar la imagen. El archivo puede estar corrupto.");
                setImageUrl(null);
            };
            img.src = dataUrl;
        };
        reader.onerror = () => {
            recordFailedValidation("file_read_error");
            alert("Error al leer el archivo.");
        };
        reader.readAsDataURL(file);
    };

    // Handle drag and drop
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        // Async validation with magic bytes check
        const isValid = await validateFile(file);
        if (!isValid) return;

        setFileName(sanitizeFilename(file.name));

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setImageUrl(dataUrl);

            const img = new Image();
            img.onload = () => {
                // Validate dimensions before processing
                if (!validateImageDimensions(img)) {
                    recordFailedValidation(`dimensions_exceeded: ${img.width}x${img.height}`);
                    setImageUrl(null);
                    return;
                }
                setImageSize({ width: img.width, height: img.height });
                recordUpload(); // Record successful upload
                convertToAscii(img);
            };
            img.onerror = () => {
                recordFailedValidation("image_load_error_drop");
                alert("Error al cargar la imagen. El archivo puede estar corrupto.");
                setImageUrl(null);
            };
            img.src = dataUrl;
        };
        reader.onerror = () => {
            recordFailedValidation("file_read_error_drop");
            alert("Error al leer el archivo.");
        };
        reader.readAsDataURL(file);
    }, [convertToAscii]);

    // Regenerate ASCII when settings change
    useEffect(() => {
        if (imageUrl) {
            const img = new Image();
            img.onload = () => convertToAscii(img);
            img.src = imageUrl;
        }
    }, [settings, imageUrl, convertToAscii]);

    // Copy to clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(asciiArt);
            setCopied(true);
            trackImmediate("copy_ascii");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = asciiArt;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Download as text file (secure)
    const handleDownloadTxt = () => {
        const blob = new Blob([asciiArt], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        try {
            const a = document.createElement("a");
            a.href = url;
            // Use sanitized filename
            const safeName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "ascii";
            a.download = `${safeName}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            trackImmediate("download_txt");
        } finally {
            // Always revoke to prevent memory leak
            URL.revokeObjectURL(url);
        }
    };

    // Download as HTML (colored version) - SECURED
    const handleDownloadHtml = () => {
        // Sanitize filename for HTML title
        const safeTitle = sanitizeChars(fileName || "image");
        const safeName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "ascii";

        // Build HTML with sanitized content
        const bgColor = settings.transparentFrame ? 'transparent' : '#0F1724';
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
    <title>ASCII Art - ${safeTitle}</title>
    <style>
        body { background: ${bgColor}; margin: 0; padding: 20px; display: flex; justify-content: center; }
        pre { 
            font-family: 'Courier New', monospace; 
            font-size: 8px; 
            line-height: 1;
            letter-spacing: 0;
            white-space: pre;
        }
        span { display: inline; }
    </style>
</head>
<body>
    <pre>${coloredAscii.map(line =>
            line.map(({ char, color }) => {
                // Sanitize char to prevent XSS
                const safeChar = char === " " ? "&nbsp;" : sanitizeChars(char);
                // Validate color format (only allow rgb())
                const safeColor = /^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/.test(color) ? color : "rgb(255,255,255)";
                return `<span style="color:${safeColor}">${safeChar}</span>`;
            }).join("")
        ).join("\n")}</pre>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        try {
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeName}-colored.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            trackImmediate("download_html");
        } finally {
            // Always revoke to prevent memory leak
            URL.revokeObjectURL(url);
        }
    };

    // Reset
    const handleReset = () => {
        setImageUrl(null);
        setAsciiArt("");
        setColoredAscii([]);
        setFileName("");
        setImageSize(null);
        setSettings(DEFAULT_SETTINGS);
        setActiveView("ascii");
        setShowAdvanced(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Apply preset
    const applyPreset = (preset: typeof PRESETS[0]) => {
        setSettings(prev => ({
            ...prev,
            width: preset.width,
            charSet: preset.charSet,
        }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "ASCII Art"} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <canvas ref={canvasRef} className="hidden" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                                Generador ASCII Art
                            </h1>
                            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                                Convierte imágenes en arte ASCII personalizable
                            </p>
                        </div>

                        {imageUrl && (
                            <button
                                onClick={handleReset}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/10 text-neutral-300 rounded-lg hover:bg-white/20 transition-colors text-sm"
                            >
                                <RefreshIcon />
                                <span className="hidden sm:inline">Nueva imagen</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Upload Area */}
                {!imageUrl && (
                    <div className="space-y-6">
                        {/* Rate Limit Error Banner */}
                        {rateLimitError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-shake">
                                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-red-300 text-sm">{rateLimitError}</span>
                                <button
                                    onClick={() => setRateLimitError(null)}
                                    className="ml-auto text-red-400 hover:text-red-300"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                            className={`
                                relative border-2 border-dashed rounded-2xl p-8 sm:p-16 text-center cursor-pointer 
                                transition-all duration-300 group min-h-[50vh] sm:min-h-[400px] flex flex-col items-center justify-center
                                ${rateLimitError
                                    ? "border-red-500/30 opacity-50 pointer-events-none"
                                    : isDragging
                                        ? "border-accent-1 bg-accent-1/10 scale-[1.01]"
                                        : "border-white/20 hover:border-accent-1/50 hover:bg-white/5"
                                }
                            `}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                                className="hidden"
                            />

                            <div className={`transition-all duration-300 ${isDragging ? "scale-110 text-accent-1" : "text-neutral-400 group-hover:text-accent-1"}`}>
                                <UploadIcon />
                            </div>

                            <div className="mt-6 space-y-2">
                                <p className="text-white font-semibold text-lg sm:text-xl">
                                    {isDragging ? "Suelta la imagen aquí" : "Arrastra una imagen"}
                                </p>
                                <p className="text-neutral-400 text-sm">
                                    o <span className="text-accent-1 underline underline-offset-2">selecciona un archivo</span>
                                </p>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {["JPG", "PNG", "GIF", "WebP", "BMP"].map(fmt => (
                                    <span key={fmt} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-neutral-500">
                                        {fmt}
                                    </span>
                                ))}
                            </div>

                            <p className="mt-4 text-xs text-neutral-600">
                                Máximo 10MB • Todo se procesa en tu navegador
                            </p>
                        </div>

                        {/* How it works */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            {[
                                { num: "1", icon: "📤", title: "Sube", desc: "Tu imagen" },
                                { num: "2", icon: "⚙️", title: "Ajusta", desc: "El estilo" },
                                { num: "3", icon: "📥", title: "Descarga", desc: "Tu arte" },
                            ].map((step) => (
                                <div key={step.num} className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                                    <span className="text-2xl sm:text-3xl">{step.icon}</span>
                                    <p className="font-medium text-white text-sm sm:text-base mt-2">{step.title}</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Editor */}
                {imageUrl && (
                    <div className="space-y-4">
                        {/* Settings Bar */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 space-y-3">
                            {/* Presets Row */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <span className="text-xs text-neutral-500 flex-shrink-0 hidden sm:block">Presets:</span>
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => applyPreset(preset)}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.width === preset.width && settings.charSet === preset.charSet
                                            ? "bg-accent-1 text-white"
                                            : "bg-white/10 text-neutral-300 hover:bg-white/20"
                                            }`}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>

                            {/* Controls Row */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {/* Width Control */}
                                <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-wide shrink-0">Ancho</span>
                                    <input
                                        type="range"
                                        min="30"
                                        max="200"
                                        value={settings.width}
                                        onChange={(e) => setSettings({ ...settings, width: parseInt(e.target.value) })}
                                        className="w-24 sm:w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                    />
                                    <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.width}</span>
                                </div>

                                {/* Toggle Buttons */}
                                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                    <button
                                        onClick={() => setSettings({ ...settings, colored: !settings.colored })}
                                        className={`p-2 rounded-md transition-all ${settings.colored
                                            ? "bg-accent-1 text-white"
                                            : "text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                        title="Modo color"
                                    >
                                        <ColorIcon filled={settings.colored} />
                                    </button>
                                    <button
                                        onClick={() => setSettings({ ...settings, inverted: !settings.inverted })}
                                        className={`p-2 rounded-md transition-all ${settings.inverted
                                            ? "bg-accent-1 text-white"
                                            : "text-neutral-400 hover:text-white hover:bg-white/10"
                                            }`}
                                        title="Invertir"
                                    >
                                        <InvertIcon />
                                    </button>
                                </div>

                                {/* Advanced Toggle */}
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${showAdvanced
                                        ? "bg-white/20 text-white"
                                        : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                                        }`}
                                >
                                    <span>Más opciones</span>
                                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                                </button>
                            </div>

                            {/* Advanced Options */}
                            {showAdvanced && (
                                <div className="pt-3 border-t border-white/10 space-y-4 animate-slideDown">
                                    {/* Character Set Section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Custom Dropdown for Character Set */}
                                        <div className="relative">
                                            <label className="block text-xs text-neutral-500 mb-1.5">Juego de caracteres</label>
                                            <button
                                                type="button"
                                                onClick={() => setCharSetDropdownOpen(!charSetDropdownOpen)}
                                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-accent-1 transition-colors flex items-center justify-between"
                                            >
                                                <span>
                                                    {settings.charSet === "standard" && "Estándar ( .:-=+*#%@)"}
                                                    {settings.charSet === "detailed" && "Detallado (70 caracteres)"}
                                                    {settings.charSet === "blocks" && "Bloques (░▒▓█)"}
                                                    {settings.charSet === "simple" && "Simple ( .oO@)"}
                                                    {settings.charSet === "binary" && "Binario (01)"}
                                                    {settings.charSet === "custom" && "Personalizado"}
                                                </span>
                                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${charSetDropdownOpen ? "rotate-180" : ""}`} />
                                            </button>
                                            {charSetDropdownOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setCharSetDropdownOpen(false)}
                                                    />
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2332] border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden">
                                                        {[
                                                            { value: "standard", label: "Estándar ( .:-=+*#%@)" },
                                                            { value: "detailed", label: "Detallado (70 caracteres)" },
                                                            { value: "blocks", label: "Bloques (░▒▓█)" },
                                                            { value: "simple", label: "Simple ( .oO@)" },
                                                            { value: "binary", label: "Binario (01)" },
                                                            { value: "custom", label: "Personalizado" },
                                                        ].map((option) => (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSettings({ ...settings, charSet: option.value as CharSetKey });
                                                                    setCharSetDropdownOpen(false);
                                                                }}
                                                                className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${settings.charSet === option.value
                                                                    ? "bg-accent-1 text-white"
                                                                    : "text-neutral-300 hover:bg-white/10"
                                                                    }`}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Custom Characters Input */}
                                        {settings.charSet === "custom" && (
                                            <div>
                                                <label className="block text-xs text-neutral-500 mb-1.5">Caracteres (oscuro → claro)</label>
                                                <input
                                                    type="text"
                                                    value={settings.customChars}
                                                    onChange={(e) => setSettings({ ...settings, customChars: e.target.value })}
                                                    placeholder=" .:-=+*#%@"
                                                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-accent-1 font-mono"
                                                />
                                            </div>
                                        )}

                                        {/* ASCII Gradient Direction */}
                                        <div>
                                            <label className="block text-xs text-neutral-500 mb-1.5">Dirección del gradiente</label>
                                            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => setSettings({ ...settings, asciiGradient: "dark-to-light" })}
                                                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${settings.asciiGradient === "dark-to-light"
                                                        ? "bg-accent-1 text-white"
                                                        : "text-neutral-400 hover:text-white"
                                                        }`}
                                                >
                                                    Oscuro → Claro
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSettings({ ...settings, asciiGradient: "light-to-dark" })}
                                                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${settings.asciiGradient === "light-to-dark"
                                                        ? "bg-accent-1 text-white"
                                                        : "text-neutral-400 hover:text-white"
                                                        }`}
                                                >
                                                    Claro → Oscuro
                                                </button>
                                            </div>
                                        </div>

                                        {/* Space Density */}
                                        <div>
                                            <label className="block text-xs text-neutral-500 mb-1.5">Densidad de espaciado</label>
                                            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                                                {[
                                                    { value: "compact", label: "Compacto" },
                                                    { value: "normal", label: "Normal" },
                                                    { value: "sparse", label: "Espaciado" },
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setSettings({ ...settings, spaceDensity: option.value as SpaceDensity })}
                                                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${settings.spaceDensity === option.value
                                                            ? "bg-accent-1 text-white"
                                                            : "text-neutral-400 hover:text-white"
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Adjustments Section */}
                                    <div className="pt-3 border-t border-white/10">
                                        <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            Ajustes de imagen
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Brightness */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <span className="text-[10px] text-neutral-500 uppercase tracking-wide w-16">Brillo</span>
                                                <input
                                                    type="range"
                                                    min="-100"
                                                    max="100"
                                                    value={settings.brightness}
                                                    onChange={(e) => setSettings({ ...settings, brightness: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.brightness}</span>
                                            </div>

                                            {/* Contrast */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <span className="text-[10px] text-neutral-500 uppercase tracking-wide w-16">Contraste</span>
                                                <input
                                                    type="range"
                                                    min="-100"
                                                    max="100"
                                                    value={settings.contrast}
                                                    onChange={(e) => setSettings({ ...settings, contrast: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.contrast}</span>
                                            </div>

                                            {/* Saturation */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <span className="text-[10px] text-neutral-500 uppercase tracking-wide w-16">Saturación</span>
                                                <input
                                                    type="range"
                                                    min="-100"
                                                    max="100"
                                                    value={settings.saturation}
                                                    onChange={(e) => setSettings({ ...settings, saturation: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-1"
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.saturation}</span>
                                            </div>

                                            {/* Hue */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <span className="text-[10px] text-neutral-500 uppercase tracking-wide w-16">Tono</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="360"
                                                    value={settings.hue}
                                                    onChange={(e) => setSettings({ ...settings, hue: parseInt(e.target.value) })}
                                                    className="flex-1 h-1 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded-lg appearance-none cursor-pointer"
                                                    style={{
                                                        background: 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))'
                                                    }}
                                                />
                                                <span className="text-xs text-neutral-300 font-mono w-8 text-right">{settings.hue}°</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters & Enhancements Section */}
                                    <div className="pt-3 border-t border-white/10">
                                        <h4 className="text-xs font-medium text-neutral-400 mb-3 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                            </svg>
                                            Filtros y mejoras
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {/* Grayscale */}
                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, grayscale: !settings.grayscale })}
                                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.grayscale
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                                </svg>
                                                Escala grises
                                            </button>

                                            {/* Sepia */}
                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, sepia: !settings.sepia })}
                                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.sepia
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                </svg>
                                                Sepia
                                            </button>

                                            {/* Quality Enhancements */}
                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, qualityEnhancements: !settings.qualityEnhancements })}
                                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.qualityEnhancements
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Nitidez
                                            </button>

                                            {/* Transparent Frame */}
                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, transparentFrame: !settings.transparentFrame })}
                                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${settings.transparentFrame
                                                    ? "bg-accent-1 text-white"
                                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                                </svg>
                                                Transparente
                                            </button>
                                        </div>
                                    </div>

                                    {/* Options Row */}
                                    <div className="pt-3 border-t border-white/10 flex flex-wrap gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={settings.preserveAspect}
                                                onChange={(e) => setSettings({ ...settings, preserveAspect: e.target.checked })}
                                                className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-accent-1 checked:border-accent-1 focus:ring-accent-1/50 transition-colors"
                                            />
                                            <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">Preservar proporción</span>
                                        </label>

                                        {/* Reset Button */}
                                        <button
                                            type="button"
                                            onClick={() => setSettings({
                                                ...settings,
                                                brightness: 0,
                                                contrast: 0,
                                                saturation: 0,
                                                hue: 0,
                                                grayscale: false,
                                                sepia: false,
                                                qualityEnhancements: false,
                                            })}
                                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <RefreshIcon />
                                            Restablecer ajustes
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile View Toggle */}
                        <div className="sm:hidden flex bg-white/5 border border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setActiveView("original")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === "original"
                                    ? "bg-white/10 text-white"
                                    : "text-neutral-400"
                                    }`}
                            >
                                <ImageIcon />
                                Original
                            </button>
                            <button
                                onClick={() => setActiveView("ascii")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === "ascii"
                                    ? "bg-white/10 text-white"
                                    : "text-neutral-400"
                                    }`}
                            >
                                <TerminalIcon />
                                ASCII Art
                            </button>
                        </div>

                        {/* Preview Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Original Image */}
                            <div className={`${activeView === "ascii" ? "hidden sm:block" : ""}`}>
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
                                        <ImageIcon />
                                        Imagen original
                                    </span>
                                    {imageSize && (
                                        <span className="text-[10px] text-neutral-600 font-mono">
                                            {imageSize.width}×{imageSize.height}px
                                        </span>
                                    )}
                                </div>
                                <div className="relative bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                                    <div className="aspect-[4/3] sm:h-[350px] lg:h-[400px] flex items-center justify-center">
                                        <img
                                            src={imageUrl}
                                            alt="Original"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ASCII Output */}
                            <div className={`${activeView === "original" ? "hidden sm:block" : ""}`}>
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
                                        <TerminalIcon />
                                        ASCII Art
                                    </span>
                                    <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
                                        <button
                                            onClick={() => setFontSize(prev => Math.max(3, prev - 1))}
                                            className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                            title="Reducir tamaño"
                                        >
                                            <ZoomOutIcon />
                                        </button>
                                        <span className="text-[10px] text-neutral-500 font-mono w-4 text-center">{fontSize}</span>
                                        <button
                                            onClick={() => setFontSize(prev => Math.min(12, prev + 1))}
                                            className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                            title="Aumentar tamaño"
                                        >
                                            <ZoomInIcon />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative bg-[#080b10] border border-white/10 rounded-xl overflow-hidden">
                                    <div className="aspect-[4/3] sm:h-[350px] lg:h-[400px] overflow-auto">
                                        {processing ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs text-neutral-400">Procesando...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <pre
                                                ref={outputRef}
                                                className="p-2 sm:p-3 font-mono whitespace-pre select-all leading-none min-h-full"
                                                style={{ fontSize: `${fontSize}px`, letterSpacing: "0px" }}
                                            >
                                                {settings.colored ? (
                                                    coloredAscii.map((line, y) => (
                                                        <div key={y} className="flex">
                                                            {line.map(({ char, color }, x) => (
                                                                <span key={`${y}-${x}`} style={{ color }}>
                                                                    {char}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-neutral-300">{asciiArt}</span>
                                                )}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center justify-center gap-2 sm:gap-3">
                                <button
                                    onClick={handleCopy}
                                    disabled={!asciiArt || processing}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${copied
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                        }`}
                                >
                                    {copied ? <CheckIcon /> : <CopyIcon />}
                                    <span>{copied ? "Copiado!" : "Copiar"}</span>
                                </button>

                                <button
                                    onClick={handleDownloadTxt}
                                    disabled={!asciiArt || processing}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-accent-1 to-accent-2 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent-1/20"
                                >
                                    <DownloadIcon />
                                    <span>TXT</span>
                                </button>

                                <button
                                    onClick={handleDownloadHtml}
                                    disabled={!asciiArt || processing}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                                >
                                    <DownloadIcon />
                                    <span>HTML</span>
                                    <span className="hidden xs:inline text-neutral-400">+ Color</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tip */}
                {imageUrl && !processing && (
                    <div className="mt-4 sm:mt-6 p-3 bg-accent-1/5 border border-accent-1/10 rounded-xl">
                        <p className="text-xs text-neutral-400 text-center sm:text-left">
                            <span className="text-accent-1 font-medium">💡 Tip:</span>{" "}
                            Usa el modo &quot;Bloques&quot; para logos e iconos, y &quot;Detallado&quot; para fotos con más definición.
                        </p>
                    </div>
                )}

                {/* Back Link */}
                <div className="mt-8 text-center">
                    <Link
                        href="/herramientas"
                        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>

            <style jsx>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-slideDown {
                    animation: slideDown 0.2s ease-out;
                }
                .animate-shake {
                    animation: shake 0.6s ease-in-out;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
