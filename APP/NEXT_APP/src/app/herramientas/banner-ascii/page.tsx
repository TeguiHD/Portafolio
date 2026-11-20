"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useCopiar } from "@/lib/tools/copiar";
import { descargarTexto } from "@/lib/tools/descargar";

const ACCENT = "#06B6D4";

/**
 * ASCII BANNER GENERATOR FOR TERMINAL
 * =====================================
 * Converts text into large ASCII art banners using FIGlet-style fonts.
 * Supports export as .sh script (MOTD) or plain text.
 *
 * SECURITY ALIGNMENT (OWASP / NIST / MITRE 2026):
 * ─────────────────────────────────────────────────
 * • OWASP A03:2021 – Injection → No eval(), no dynamic code execution.
 *   Output is pure text. Input is sanitized to printable ASCII only.
 * • NIST SP 800-123 – Guide to General Server Security →
 *   Legal banners (MOTD) are recommended by NIST for warning unauthorized users.
 * • MITRE CWE-20 – Input Validation → Strict character whitelist (printable ASCII).
 *   Input length limited to prevent resource exhaustion.
 * • MITRE CWE-400 – Resource Exhaustion → Max input length prevents
 *   generating excessively large outputs.
 * • All processing client-side, no server I/O.
 * • Shell script export uses safe echo commands with proper escaping.
 */

// SECURITY(CWE-400): Limits
const MAX_INPUT_LENGTH = 80;

// FIGlet-style font definitions (subset for client-side rendering)
// «Big» y «Slant» se quitaron: no eran tipografías, solo la letra metida en un marco o rodeada de barras.
type FontName = "standard" | "banner" | "small" | "block" | "mini";

interface FontDef {
    name: string;
    height: number;
    chars: Record<string, string[]>;
}

// Standard font (simplified FIGlet)
const STANDARD_FONT: FontDef = {
    name: "Standard",
    height: 6,
    chars: {
        "A": [
            "    _    ",
            "   / \\   ",
            "  / _ \\  ",
            " / ___ \\ ",
            "/_/   \\_\\",
            "         ",
        ],
        "B": [
            " ____  ",
            "| __ ) ",
            "|  _ \\ ",
            "| |_) |",
            "|____/ ",
            "       ",
        ],
        "C": [
            "  ____ ",
            " / ___|",
            "| |    ",
            "| |___ ",
            " \\____|",
            "       ",
        ],
        "D": [
            " ____  ",
            "|  _ \\ ",
            "| | | |",
            "| |_| |",
            "|____/ ",
            "       ",
        ],
        "E": [
            " _____ ",
            "| ____|",
            "|  _|  ",
            "| |___ ",
            "|_____|",
            "       ",
        ],
        "F": [
            " _____ ",
            "|  ___|",
            "| |_   ",
            "|  _|  ",
            "|_|    ",
            "       ",
        ],
        "G": [
            "  ____ ",
            " / ___|",
            "| |  _ ",
            "| |_| |",
            " \\____|",
            "       ",
        ],
        "H": [
            " _   _ ",
            "| | | |",
            "| |_| |",
            "|  _  |",
            "|_| |_|",
            "       ",
        ],
        "I": [
            " ___ ",
            "|_ _|",
            " | | ",
            " | | ",
            "|___|",
            "     ",
        ],
        "J": [
            "     _ ",
            "    | |",
            " _  | |",
            "| |_| |",
            " \\___/ ",
            "       ",
        ],
        "K": [
            " _  __",
            "| |/ /",
            "| ' / ",
            "| . \\ ",
            "|_|\\_\\",
            "      ",
        ],
        "L": [
            " _     ",
            "| |    ",
            "| |    ",
            "| |___ ",
            "|_____|",
            "       ",
        ],
        "M": [
            " __  __ ",
            "|  \\/  |",
            "| |\\/| |",
            "| |  | |",
            "|_|  |_|",
            "        ",
        ],
        "N": [
            " _   _ ",
            "| \\ | |",
            "|  \\| |",
            "| |\\  |",
            "|_| \\_|",
            "       ",
        ],
        "O": [
            "  ___  ",
            " / _ \\ ",
            "| | | |",
            "| |_| |",
            " \\___/ ",
            "       ",
        ],
        "P": [
            " ____  ",
            "|  _ \\ ",
            "| |_) |",
            "|  __/ ",
            "|_|    ",
            "       ",
        ],
        "Q": [
            "  ___  ",
            " / _ \\ ",
            "| | | |",
            "| |_| |",
            " \\__\\_\\",
            "       ",
        ],
        "R": [
            " ____  ",
            "|  _ \\ ",
            "| |_) |",
            "|  _ < ",
            "|_| \\_\\",
            "       ",
        ],
        "S": [
            " ____  ",
            "/ ___| ",
            "\\___ \\ ",
            " ___) |",
            "|____/ ",
            "       ",
        ],
        "T": [
            " _____ ",
            "|_   _|",
            "  | |  ",
            "  | |  ",
            "  |_|  ",
            "       ",
        ],
        "U": [
            " _   _ ",
            "| | | |",
            "| | | |",
            "| |_| |",
            " \\___/ ",
            "       ",
        ],
        "V": [
            "__     __",
            "\\ \\   / /",
            " \\ \\ / / ",
            "  \\ V /  ",
            "   \\_/   ",
            "         ",
        ],
        "W": [
            "__        __",
            "\\ \\      / /",
            " \\ \\ /\\ / / ",
            "  \\ V  V /  ",
            "   \\_/\\_/   ",
            "            ",
        ],
        "X": [
            "__  __",
            "\\ \\/ /",
            " \\  / ",
            " /  \\ ",
            "/_/\\_\\",
            "      ",
        ],
        "Y": [
            "__   __",
            "\\ \\ / /",
            " \\ V / ",
            "  | |  ",
            "  |_|  ",
            "       ",
        ],
        "Z": [
            " _____",
            "|__  /",
            "  / / ",
            " / /_ ",
            "/____|",
            "      ",
        ],
        "0": [
            "  ___  ",
            " / _ \\ ",
            "| | | |",
            "| |_| |",
            " \\___/ ",
            "       ",
        ],
        "1": [
            " _ ",
            "/ |",
            "| |",
            "| |",
            "|_|",
            "   ",
        ],
        "2": [
            " ____  ",
            "|___ \\ ",
            "  __) |",
            " / __/ ",
            "|_____|",
            "       ",
        ],
        "3": [
            " _____ ",
            "|___ / ",
            "  |_ \\ ",
            " ___) |",
            "|____/ ",
            "       ",
        ],
        "4": [
            " _  _   ",
            "| || |  ",
            "| || |_ ",
            "|__  _/ ",
            "   |_|  ",
            "        ",
        ],
        "5": [
            " ____  ",
            "| ___| ",
            "|___ \\ ",
            " ___) |",
            "|____/ ",
            "       ",
        ],
        "6": [
            "  __   ",
            " / /_  ",
            "| '_ \\ ",
            "| (_) |",
            " \\___/ ",
            "       ",
        ],
        "7": [
            " _____ ",
            "|___  |",
            "   / / ",
            "  / /  ",
            " /_/   ",
            "       ",
        ],
        "8": [
            "  ___  ",
            " ( _ ) ",
            " / _ \\ ",
            "| (_) |",
            " \\___/ ",
            "       ",
        ],
        "9": [
            "  ___  ",
            " / _ \\ ",
            "| (_) |",
            " \\__, |",
            "   /_/ ",
            "       ",
        ],
        " ": [
            "   ",
            "   ",
            "   ",
            "   ",
            "   ",
            "   ",
        ],
        "!": [
            " _ ",
            "| |",
            "| |",
            "|_|",
            "(_)",
            "   ",
        ],
        ".": [
            "   ",
            "   ",
            "   ",
            " _ ",
            "(_)",
            "   ",
        ],
        "-": [
            "       ",
            "       ",
            " _____ ",
            "|_____|",
            "       ",
            "       ",
        ],
        "_": [
            "       ",
            "       ",
            "       ",
            "       ",
            " _____ ",
            "|_____|",
        ],
        "@": [
            "   ____   ",
            "  / __ \\  ",
            " | |  | | ",
            " | |__| | ",
            "  \\____/  ",
            "          ",
        ],
        "#": [
            "   _  _   ",
            " _| || |_ ",
            "|_  ..  _|",
            "|_      _|",
            "  |_||_|  ",
            "          ",
        ],
        "/": [
            "    __",
            "   / /",
            "  / / ",
            " / /  ",
            "/_/   ",
            "      ",
        ],
        ":": [
            "   ",
            " _ ",
            "(_)",
            " _ ",
            "(_)",
            "   ",
        ],
    },
};

// Banner font (hash-based)
const BANNER_FONT: FontDef = {
    name: "Banner",
    height: 7,
    chars: generateBannerFont(),
};

// Small font
const SMALL_FONT: FontDef = {
    name: "Small",
    height: 4,
    chars: generateSmallFont(),
};

// Block font
const BLOCK_FONT: FontDef = {
    name: "Block",
    height: 5,
    chars: generateBoxFont(),
};

function generateBannerFont(): Record<string, string[]> {
    const chars: Record<string, string[]> = {};
    const letters: Record<string, number[][]> = {
        A: [[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
        B: [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,1,1,0]],
        C: [[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
        D: [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
        E: [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]],
        F: [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
        G: [[0,1,1,1],[1,0,0,0],[1,0,1,1],[1,0,0,1],[0,1,1,1]],
        H: [[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
        I: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
        J: [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
        K: [[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
        L: [[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
        M: [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        N: [[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1],[1,0,0,1]],
        O: [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
        P: [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
        Q: [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,1,0],[0,1,0,1]],
        R: [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
        S: [[0,1,1,1],[1,0,0,0],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
        T: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        U: [[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
        V: [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
        W: [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
        X: [[1,0,0,1],[0,1,1,0],[0,1,1,0],[0,1,1,0],[1,0,0,1]],
        Y: [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        Z: [[1,1,1,1],[0,0,1,0],[0,1,0,0],[1,0,0,0],[1,1,1,1]],
        "0": [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
        "1": [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
        "2": [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
        "3": [[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
        "4": [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
        "5": [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
        "6": [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
        "7": [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
        "8": [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
        "9": [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
        "!": [[1],[1],[1],[0],[1]],
        ".": [[0],[0],[0],[0],[1]],
        ":": [[0],[1],[0],[1],[0]],
        "-": [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
        "_": [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[1,1,1]],
        "/": [[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0]],
        "#": [[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0]],
        "@": [[0,1,1,1,0],[1,0,0,0,1],[1,0,1,1,1],[1,0,1,1,0],[0,1,1,1,1]],
    };

    // Add space
    chars[" "] = Array(7).fill("    ");

    const pixelChar = "██";
    const emptyChar = "  ";

    for (const [letter, grid] of Object.entries(letters)) {
        const lines: string[] = [""];
        for (const row of grid) {
            lines.push(row.map(v => v ? pixelChar : emptyChar).join(""));
        }
        lines.push("");
        chars[letter] = lines;
    }

    return chars;
}

function generateSmallFont(): Record<string, string[]> {
    const chars: Record<string, string[]> = {};
    const simple: Record<string, string[]> = {
        A: [" _ ","(_|","  |"],
        B: [" _ ","|_)","|_)"],
        C: [" _","(","(_"],
        D: [" _ ","| \\","|_/"],
        E: [" _","(- ","(_"],
        F: [" _","(- ","|  "],
        G: [" _ ","(_ ","._)"],
        H: ["   ","|_|","|_|"],
        I: [" _"," | ","|_"],
        J: ["  _","  |","(_|"],
        K: ["   ","|/ ","|\\_ "],
        L: ["   ","|  ","|_ "],
        M: ["     ","|'V'|","|   |"],
        N: ["    ","|\\ |","| \\|"],
        O: [" _ ","(_)","(_)"],
        P: [" _ ","|_)","| "],
        Q: [" _ ","(_\\","  |"],
        R: [" _ ","|_)","| \\"],
        S: [" _","(_"," _)"],
        T: ["___"," | "," | "],
        U: ["   ","|_|","(_|"],
        V: ["    ","\\ / "," V  "],
        W: ["       ","\\_|_/ "," | |  "],
        X: ["   ","\\/ ","/\\ "],
        Y: ["   ","\\/ "," | "],
        Z: ["__ "," / ","/__"],
        " ": ["   ","   ","   "],
    };
    for (const [k, v] of Object.entries(simple)) {
        chars[k] = ["", ...v];
    }
    for (let d = 0; d <= 9; d++) {
        chars[String(d)] = ["", " _ ", `|${d}|`, "|_|"];
    }
    return chars;
}

function generateBoxFont(): Record<string, string[]> {
    const chars: Record<string, string[]> = {};
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
    for (const c of alphabet) {
        if (c === " ") {
            chars[c] = [" ", " ", " ", " ", " "];
            continue;
        }
        chars[c] = [
            "┌───┐",
            "│   │",
            `│ ${c} │`,
            "│   │",
            "└───┘",
        ];
    }
    return chars;
}

const FONTS: Record<FontName, FontDef> = {
    standard: STANDARD_FONT,
    banner: BANNER_FONT,
    small: SMALL_FONT,
    block: BLOCK_FONT,
    mini: {
        name: "Mini",
        height: 3,
        chars: (() => {
            const c: Record<string, string[]> = {};
            const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
            for (const ch of alpha) {
                if (ch === " ") { c[ch] = ["  ", "  ", "  "]; continue; }
                c[ch] = [`╔${ch}╗`, `║${ch}║`, `╚${ch}╝`];
            }
            return c;
        })(),
    },
};

/**
 * Render text as ASCII art using the specified font.
 * SECURITY(CWE-20): Only processes printable ASCII characters.
 */
/** Mayúsculas sin tildes: «Ñandú» → «NANDU» (antes la ñ y las vocales con tilde desaparecían). */
function normalizar(text: string): string {
    return text.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function renderBanner(text: string, fontName: FontName): string {
    const font = FONTS[fontName];
    // SECURITY: Sanitize input - only printable ASCII
    const clean = normalizar(text).replace(/[^A-Z0-9 !.\-_@#/:]/g, "").slice(0, MAX_INPUT_LENGTH);

    if (!clean.trim()) return "";

    const lines: string[] = Array(font.height).fill("");

    for (const char of clean) {
        const charDef = font.chars[char] || font.chars[" "] || Array(font.height).fill(" ");
        // Todas las filas de un carácter al mismo ancho: si una es más corta, las letras siguientes se descuadran.
        const ancho = Math.max(...charDef.map((fila) => fila.length));
        for (let row = 0; row < font.height; row++) {
            lines[row] += (charDef[row] ?? "").padEnd(ancho) + " ";
        }
    }

    return lines.map((linea) => linea.trimEnd()).join("\n");
}

/** Caracteres escritos que esta fuente no dibuja (salen como espacio o se omiten). */
function sinGlifo(text: string, fontName: FontName): string[] {
    const font = FONTS[fontName];
    const faltan = new Set<string>();
    for (const ch of normalizar(text)) {
        if (ch === " ") continue;
        if (!/[A-Z0-9!.\-_@#/:]/.test(ch) || !font.chars[ch]) faltan.add(ch);
    }
    return [...faltan];
}

/**
 * Generate a .sh script for MOTD/SSH banner.
 * SECURITY: Uses printf with proper escaping to prevent injection.
 */
function generateShScript(banner: string, serverName: string): string {
    // SECURITY(CWE-78): Escape for shell - no command injection possible
    const escapedBanner = banner
        .split("\n")
        .map(line => line.replace(/\\/g, "\\\\").replace(/'/g, "'\\''").replace(/`/g, "\\`").replace(/\$/g, "\\$"))
        .join("\\n");

    return `#!/bin/bash
# ══════════════════════════════════════════════════════════
# SSH Banner / MOTD Script
# Generated by NicoHolas Security Tools
# Server: ${serverName.replace(/[^a-zA-Z0-9._\-\s]/g, "")}
# Date: ${new Date().toISOString().split("T")[0]}
# 
# NIST SP 800-123: Legal banners are recommended for all
# systems to warn unauthorized users before login.
# ══════════════════════════════════════════════════════════

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color
BOLD='\\033[1m'

clear

echo -e "\${CYAN}"
printf '%b\\n' '${escapedBanner}'
echo -e "\${NC}"

echo -e "\${YELLOW}══════════════════════════════════════════════════════════\${NC}"
echo -e "\${RED}\${BOLD}⚠️  WARNING: Authorized Access Only\${NC}"
echo -e "\${NC}This system is for authorized users only. All activities"
echo -e "are monitored and logged. Unauthorized access is a"
echo -e "violation of law and will be prosecuted."
echo -e "\${YELLOW}══════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "\${GREEN}Server:\${NC} ${serverName.replace(/[^a-zA-Z0-9._\-\s]/g, "")}"
echo -e "\${GREEN}Date:\${NC}   $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo -e "\${GREEN}Uptime:\${NC} $(uptime -p 2>/dev/null || uptime)"
echo -e "\${GREEN}Kernel:\${NC} $(uname -r)"
echo ""
`;
}

export default function AsciiBannerPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("banner-ascii");
    const [text, setText] = useState("HELLO");
    const [fontName, setFontName] = useState<FontName>("standard");
    const { copiado, fallo, copiar } = useCopiar(2000);

    const banner = useMemo(() => renderBanner(text, fontName), [text, fontName]);
    const faltan = useMemo(() => sinGlifo(text, fontName), [text, fontName]);

    // Se llama banner.sh, como en la guía de instalación de abajo.
    const handleDownloadScript = useCallback(() => {
        descargarTexto(generateShScript(banner, text), "banner.sh", "text/x-shellscript");
    }, [banner, text]);

    // El archivo se muestra tal cual al conectarse: sin líneas «#» de comentario, que aparecerían en pantalla.
    const handleDownloadConf = useCallback(() => {
        const content = `${banner}

═══════════════════════════════════════════
⚠  WARNING: Authorized access only.
All activities are monitored and logged.
═══════════════════════════════════════════
`;
        descargarTexto(content, "motd");
    }, [banner]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Generador de Banners ASCII"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <ToolPageHeader slug="banner-ascii" title={<>Generador de Banners ASCII</>} description={<>Crea arte ASCII para terminales, MOTD de servidores y banners SSH</>} />

                {/* Input */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
                    <label className="block">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">Texto</span>
                            <span className="text-xs text-neutral-500" aria-hidden="true">{text.length}/{MAX_INPUT_LENGTH}</span>
                        </div>
                        <input
                            type="text"
                            aria-describedby={faltan.length ? "banner-faltan" : undefined}
                            value={text}
                            onChange={e => setText(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                            placeholder="Escribe el texto para tu banner..."
                            className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:ring-2"
                            style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                            spellCheck={false}
                            maxLength={MAX_INPUT_LENGTH}
                        />
                    </label>
                    {faltan.length > 0 && (
                        <p id="banner-faltan" className="mt-2 text-xs text-neutral-400">
                            Esta fuente no dibuja {faltan.map((c) => `«${c}»`).join(" ")}: {faltan.length === 1 ? "se omite" : "se omiten"}. Las tildes y la ñ salen como la letra base.
                        </p>
                    )}
                </div>

                {/* Font Selection */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                    <span id="banner-fuente" className="text-sm font-medium text-white block mb-3">Fuente</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="group" aria-labelledby="banner-fuente">
                        {(Object.keys(FONTS) as FontName[]).map(f => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={fontName === f}
                                onClick={() => setFontName(f)}
                                className={`min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-all ${fontName === f
                                    ? "text-white border"
                                    : "bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10"
                                    }`}
                                style={fontName === f ? {
                                    backgroundColor: `${ACCENT}20`,
                                    borderColor: `${ACCENT}50`,
                                    color: ACCENT,
                                } : undefined}
                            >
                                {FONTS[f].name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                {banner && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-white">Vista Previa</span>
                            <button
                                type="button"
                                onClick={() => { void copiar(banner, "ascii"); }}
                                className="min-h-11 px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                style={{ background: `${ACCENT}30` }}
                            >
                                {copiado === "ascii" ? "✓ Copiado" : fallo === "ascii" ? "No se pudo copiar" : "Copiar ASCII"}
                            </button>
                        </div>
                        <div className="bg-[#0A0E17] rounded-lg p-4 overflow-x-auto border border-white/5">
                            <pre className="text-xs sm:text-sm text-cyan-400 font-mono whitespace-pre leading-tight">
                                {banner}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Export Options */}
                {banner && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        <button
                            type="button"
                            onClick={handleDownloadScript}
                            className="py-3 px-4 rounded-xl text-sm font-medium text-white transition-all motion-safe:hover:scale-[1.005]"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}
                        >
                            📥 Descargar .sh (MOTD)
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadConf}
                            className="py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition-all"
                        >
                            📄 Descargar motd (conf)
                        </button>
                        <button
                            type="button"
                            onClick={() => { void copiar(generateShScript(banner, text), "script"); }}
                            className="py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition-all"
                        >
                            {copiado === "script" ? "✓ Copiado" : fallo === "script" ? "No se pudo copiar" : "📋 Copiar Script .sh"}
                        </button>
                    </div>
                )}
                <p role="status" className="sr-only">{copiado ? "Copiado" : fallo ? "No se pudo copiar" : ""}</p>

                {/* Quick Presets */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                    <span className="text-sm font-medium text-white block mb-3">Presets Rápidos</span>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: "Server", text: "SERVER" },
                            { label: "Welcome", text: "WELCOME" },
                            { label: "Warning", text: "WARNING" },
                            { label: "Hack The Box", text: "HTB" },
                            { label: "Root", text: "ROOT" },
                            { label: "Admin", text: "ADMIN" },
                            { label: "Dev", text: "DEV" },
                            { label: "Security", text: "SECURITY" },
                        ].map(preset => (
                            <button
                                key={preset.text}
                                type="button"
                                onClick={() => setText(preset.text)}
                                className="min-h-11 px-3 py-1.5 rounded-lg bg-white/5 text-sm text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Installation Guide */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">📖 Cómo instalar</h3>
                    <div className="space-y-3 text-xs text-neutral-400">
                        <div className="bg-[#0F1724] rounded-lg p-3">
                            <p className="text-neutral-500 mb-1"># Opción 1: Como MOTD (se muestra al iniciar sesión)</p>
                            <code className="text-green-400">
                                sudo cp banner.sh /etc/profile.d/banner.sh<br />
                                sudo chmod +x /etc/profile.d/banner.sh
                            </code>
                        </div>
                        <div className="bg-[#0F1724] rounded-lg p-3">
                            <p className="text-neutral-500 mb-1"># Opción 2: Como banner SSH previo al login</p>
                            <code className="text-green-400">
                                sudo cp motd /etc/issue.net<br />
                                # En /etc/ssh/sshd_config: Banner /etc/issue.net<br />
                                sudo systemctl restart sshd
                            </code>
                        </div>
                        <div className="bg-[#0F1724] rounded-lg p-3">
                            <p className="text-neutral-500 mb-1"># Opción 3: Bash ~/.bashrc personal</p>
                            <code className="text-green-400">
                                echo &apos;source ~/banner.sh&apos; {">>"} ~/.bashrc
                            </code>
                        </div>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
                    <p className="text-xs text-cyan-300">
                        <strong>🛡️ NIST SP 800-123:</strong> Los banners legales en sistemas son una práctica
                        recomendada por NIST para advertir a usuarios no autorizados antes del acceso.
                        Todo se genera localmente en tu navegador.
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <Link href={"/herramientas" as Route} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver a herramientas
                    </Link>
                </div>
            </main>
        </div>
    );
}
