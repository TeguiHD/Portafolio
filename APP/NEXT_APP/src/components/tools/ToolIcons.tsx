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

// Category Icons
export const UtilityIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
);

export const SecurityIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

export const DevIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 2" />
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
};

// Category icon mapping
export const CATEGORY_ICONS: Record<string, FC<IconProps>> = {
    utility: UtilityIcon,
    security: SecurityIcon,
    dev: DevIcon,
};

// Category display config
export const CATEGORY_CONFIG: Record<string, {
    name: string;
    color: string;
    bgColor: string;
    borderColor: string;
    iconBg: string;
}> = {
    utility: {
        name: "Utilidades",
        color: "#FF8A00",
        bgColor: "from-[#FF8A00]/20 to-[#FF8A00]/5",
        borderColor: "border-[#FF8A00]/30",
        iconBg: "from-[#FF8A00]/20 to-[#FF8A00]/10",
    },
    security: {
        name: "Seguridad",
        color: "#00B8A9",
        bgColor: "from-[#00B8A9]/20 to-[#00B8A9]/5",
        borderColor: "border-[#00B8A9]/30",
        iconBg: "from-[#00B8A9]/20 to-[#00B8A9]/10",
    },
    dev: {
        name: "Desarrollo",
        color: "#6366F1",
        bgColor: "from-[#6366F1]/20 to-[#6366F1]/5",
        borderColor: "border-[#6366F1]/30",
        iconBg: "from-[#6366F1]/20 to-[#6366F1]/10",
    },
};
