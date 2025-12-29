// Tool Icons - SVG icons for each tool
import { FC, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// QR Code Generator Icon
export const QRIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="3" height="3" />
        <path d="M18 14h3v3" />
        <path d="M14 18h3v3" />
        <path d="M18 18h3v3" />
        <rect x="5.5" y="5.5" width="2" height="2" fill="currentColor" stroke="none" />
        <rect x="16.5" y="5.5" width="2" height="2" fill="currentColor" stroke="none" />
        <rect x="5.5" y="16.5" width="2" height="2" fill="currentColor" stroke="none" />
    </svg>
);

// Password Generator Icon - Lock with key
export const PasswordIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <path d="M12 17v2" />
    </svg>
);

// Unit Converter Icon - Scale/Balance
export const ScaleIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3v18" />
        <path d="M5 7l7-4 7 4" />
        <path d="M3 12l2-5h0l3 5a4 4 0 0 1-5 0z" />
        <path d="M19 12l2-5h0l-3-5a4 4 0 0 0 5 0z" />
        <path d="M16 12l2-5h0l3 5a4 4 0 0 1-5 0z" />
    </svg>
);

// Regex Tester Icon - Code brackets
export const RegexIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 18l6-6-6-6" />
        <path d="M8 6l-6 6 6 6" />
        <path d="M14.5 4l-5 16" />
    </svg>
);

// Base64/Image Converter Icon
export const ImageCodeIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
        <path d="M14 14l1 1" />
        <path d="M17 11l2 2" />
        <text x="16" y="8" fontSize="5" fill="currentColor" fontFamily="monospace">01</text>
    </svg>
);

// ASCII Art Generator Icon
export const AsciiArtIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        {/* Image frame */}
        <rect x="2" y="3" width="12" height="10" rx="1" />
        <circle cx="5.5" cy="6.5" r="1" />
        <path d="M14 11l-3-3-5 5" />
        {/* ASCII text representation */}
        <text x="16" y="7" fontSize="4" fill="currentColor" fontFamily="monospace">@#</text>
        <text x="16" y="11" fontSize="4" fill="currentColor" fontFamily="monospace">*.</text>
        {/* Arrow indicating conversion */}
        <path d="M15 15l3-3m0 0l3 3m-3-3v8" strokeWidth="1.5" />
    </svg>
);

// Link Generator Icon
export const LinkIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

// Random Picker / Dice Icon
export const DiceIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
        <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
);

// Binary Translator Icon
export const BinaryIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <text x="3" y="10" fontSize="8" fill="currentColor" fontFamily="monospace" stroke="none">01</text>
        <text x="3" y="20" fontSize="8" fill="currentColor" fontFamily="monospace" stroke="none">10</text>
        <path d="M14 6l4-4m0 0l4 4m-4-4v12" />
        <path d="M14 18l4 4m0 0l4-4m-4 4V10" />
    </svg>
);

// Calculator Icon
export const CalculatorIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <rect x="6" y="4" width="12" height="4" rx="1" />
        <path d="M7 10h2m4 0h2m4 0h2" />
        <path d="M7 14h2m4 0h2m4 0h2" />
        <path d="M7 18h2m4 0h6" />
    </svg>
);

// Category Icons - NEW CATEGORIES
export const GeneracionIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3v3m0 12v3M21 12h-3M6 12H3" />
        <circle cx="12" cy="12" r="4" />
        <path d="M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12M18.36 18.36l-2.12-2.12M7.76 7.76L5.64 5.64" />
    </svg>
);

export const ConversionIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
);

export const ProductividadIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

// Tool icon mapping by slug
export const TOOL_ICONS: Record<string, FC<IconProps>> = {
    "qr-generator": QRIcon,
    "password-generator": PasswordIcon,
    "unit-converter": ScaleIcon,
    "regex-tester": RegexIcon,
    "image-base64": ImageCodeIcon,
    "ascii-art": AsciiArtIcon,
    "link-generator": LinkIcon,
    "random-picker": DiceIcon,
    "tax-calculator": CalculatorIcon,
    "binary-translator": BinaryIcon,
};

// Category icon mapping - NEW CATEGORIES
export const CATEGORY_ICONS: Record<string, FC<IconProps>> = {
    "generación": GeneracionIcon,
    "conversión": ConversionIcon,
    "productividad": ProductividadIcon,
};

// Category display config - NEW CATEGORIES
export const CATEGORY_CONFIG: Record<string, {
    name: string;
    color: string;
    bgColor: string;
    borderColor: string;
    iconBg: string;
}> = {
    "generación": {
        name: "Generación",
        color: "#FF8A00",
        bgColor: "from-[#FF8A00]/20 to-[#FF8A00]/5",
        borderColor: "border-[#FF8A00]/30",
        iconBg: "from-[#FF8A00]/20 to-[#FF8A00]/10",
    },
    "conversión": {
        name: "Conversión",
        color: "#00B8A9",
        bgColor: "from-[#00B8A9]/20 to-[#00B8A9]/5",
        borderColor: "border-[#00B8A9]/30",
        iconBg: "from-[#00B8A9]/20 to-[#00B8A9]/10",
    },
    "productividad": {
        name: "Productividad",
        color: "#6366F1",
        bgColor: "from-[#6366F1]/20 to-[#6366F1]/5",
        borderColor: "border-[#6366F1]/30",
        iconBg: "from-[#6366F1]/20 to-[#6366F1]/10",
    },
};

