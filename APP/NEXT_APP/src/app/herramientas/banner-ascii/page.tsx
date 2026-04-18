"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useToolAccess } from "@/hooks/useToolAccess";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";

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
type FontName = "standard" | "big" | "banner" | "slant" | "small" | "block" | "mini";

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

// Big font (simpler block style)
const BIG_FONT: FontDef = {
    name: "Big",
    height: 6,
    chars: generateBlockFont(6),
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

function generateBlockFont(height: number): Record<string, string[]> {
    const chars: Record<string, string[]> = {};
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !.-_@#/:";
    for (const c of alphabet) {
        if (c === " ") {
            chars[c] = Array(height).fill("    ");
            continue;
        }
        const w = 7;
        const lines: string[] = [];
        lines.push(" " + "█".repeat(w - 2) + " ");
        lines.push("█" + " ".repeat(Math.floor((w - 3) / 2)) + c + " ".repeat(Math.ceil((w - 3) / 2)) + "█");
        for (let i = 2; i < height - 1; i++) {
            lines.push("█" + " ".repeat(w - 2) + "█");
        }
        lines.push(" " + "█".repeat(w - 2) + " ");
        chars[c] = lines;
    }
    return chars;
}

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

    // Numbers (simplified)
    for (let d = 0; d <= 9; d++) {
        if (!chars[String(d)]) {
            chars[String(d)] = [
                "",
                pixelChar.repeat(3),
                pixelChar + emptyChar + pixelChar,
                pixelChar + emptyChar + pixelChar,
                pixelChar + emptyChar + pixelChar,
                pixelChar.repeat(3),
                "",
            ];
        }
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
    big: BIG_FONT,
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
    slant: {
        name: "Slant",
        height: 5,
        chars: (() => {
            const c: Record<string, string[]> = {};
            // Simplified slant-style for common letters
            const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
            for (const ch of alpha) {
                if (ch === " ") { c[ch] = ["    ", "    ", "    ", "    ", "    "]; continue; }
                c[ch] = [
                    `   __${ch}`,
                    `  / ${ch}/`,
                    ` / ${ch}/ `,
                    `/_${ch}/  `,
                    `      `,
                ];
            }
            return c;
        })(),
    },
};

/**
 * Render text as ASCII art using the specified font.
 * SECURITY(CWE-20): Only processes printable ASCII characters.
 */
function renderBanner(text: string, fontName: FontName): string {
    const font = FONTS[fontName];
    // SECURITY: Sanitize input - only printable ASCII
    const clean = text.toUpperCase().replace(/[^A-Z0-9 !.\-_@#/:]/g, "").slice(0, MAX_INPUT_LENGTH);

    if (!clean) return "";

    const lines: string[] = Array(font.height).fill("");

    for (const char of clean) {
        const charDef = font.chars[char] || font.chars[" "] || Array(font.height).fill(" ");
        for (let row = 0; row < font.height; row++) {
            lines[row] += (charDef[row] || "") + " ";
        }
    }

    return lines.join("\n");
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
    const [copied, setCopied] = useState(false);
    const [copiedScript, setCopiedScript] = useState(false);

    const banner = useMemo(() => renderBanner(text, fontName), [text, fontName]);

    const handleCopy = useCallback(async (content: string, isScript: boolean) => {
        await navigator.clipboard.writeText(content);
        if (isScript) {
            setCopiedScript(true);
            setTimeout(() => setCopiedScript(false), 2000);
        } else {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, []);

    const handleDownloadScript = useCallback(() => {
        const script = generateShScript(banner, text);
        const blob = new Blob([script], { type: "text/x-shellscript" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `banner_${text.toLowerCase().replace(/[^a-z0-9]/g, "_")}.sh`;
        link.click();
        URL.revokeObjectURL(url);
    }, [banner, text]);

    const handleDownloadConf = useCallback(() => {
        const content = `# /etc/motd or /etc/issue.net
# Generated by NicoHolas Security Tools
# NIST SP 800-123: Systems should display a legal banner
#
${banner}

═══════════════════════════════════════════
⚠  WARNING: Authorized access only.
All activities are monitored and logged.
═══════════════════════════════════════════
`;
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "motd";
        link.click();
        URL.revokeObjectURL(url);
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
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Generador de Banners ASCII
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base">
                        Crea arte ASCII para terminales, MOTD de servidores y banners SSH
                    </p>
                </div>

                {/* Input */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
                    <label className="block">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">Texto</span>
                            <span className="text-xs text-neutral-500">{text.length}/{MAX_INPUT_LENGTH}</span>
                        </div>
                        <input
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                            placeholder="Escribe el texto para tu banner..."
                            className="w-full bg-[#0F1724] border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono outline-none focus:ring-2"
                            style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
                            spellCheck={false}
                            maxLength={MAX_INPUT_LENGTH}
                        />
                    </label>
                </div>

                {/* Font Selection */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                    <span className="text-sm font-medium text-white block mb-3">Fuente</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(Object.keys(FONTS) as FontName[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFontName(f)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${fontName === f
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
                                onClick={() => handleCopy(banner, false)}
                                className="px-3 py-1 rounded-md text-xs font-medium text-white transition-colors"
                                style={{ background: `${ACCENT}30` }}
                            >
                                {copied ? "✓ Copiado" : "Copiar ASCII"}
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
                            onClick={handleDownloadScript}
                            className="py-3 px-4 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.005]"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)` }}
                        >
                            📥 Descargar .sh (MOTD)
                        </button>
                        <button
                            onClick={handleDownloadConf}
                            className="py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition-all"
                        >
                            📄 Descargar motd (conf)
                        </button>
                        <button
                            onClick={() => handleCopy(generateShScript(banner, text), true)}
                            className="py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition-all"
                        >
                            {copiedScript ? "✓ Copiado" : "📋 Copiar Script .sh"}
                        </button>
                    </div>
                )}

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
                                onClick={() => setText(preset.text)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
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
