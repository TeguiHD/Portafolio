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

// =================== NEW TOOL ICONS ===================

// Image Converter Icon
export const ImageConverterIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="3" width="9" height="9" rx="1" />
        <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
        <path d="M11 10L8 7l-4 5" />
        <path d="M14 10l3-3m0 0l3 3m-3-3v8" />
        <rect x="13" y="14" width="9" height="7" rx="1" />
        <text x="15" y="19.5" fontSize="4.5" fill="currentColor" fontFamily="monospace" stroke="none">WP</text>
    </svg>
);

// Image Cropper Icon
export const CropIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 2v4" />
        <path d="M2 6h4" />
        <path d="M18 22v-4" />
        <path d="M22 18h-4" />
        <rect x="6" y="6" width="12" height="12" rx="1" />
        <path d="M6 10h12" />
        <path d="M10 6v12" />
    </svg>
);

// Background Remover Icon
export const BgRemoveIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9" />
        <path d="M17 3l4 4" />
        <path d="M21 3l-4 4" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="M5 16l4-4 3 3 2-2 4 4" />
    </svg>
);

// ICO Converter Icon
export const IcoIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <rect x="7" y="7" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.5" />
        <rect x="13" y="7" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.3" />
        <rect x="7" y="13" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.3" />
        <rect x="13" y="13" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.5" />
        <text x="8.5" y="22" fontSize="4" fill="currentColor" fontFamily="monospace" stroke="none">.ico</text>
    </svg>
);

// Image Compressor Icon
export const CompressIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 14l4-4 3 3 2-2 4 4" />
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M9 4v2m0 2v2m0 2v2m0 2v2m0 2v2" strokeDasharray="2 2" />
        <path d="M15 4v2m0 2v2m0 2v2m0 2v2m0 2v2" strokeDasharray="2 2" />
    </svg>
);

// Image Resizer Icon
export const ResizeIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M15 4v16" strokeDasharray="3 2" />
        <path d="M4 15h16" strokeDasharray="3 2" />
        <circle cx="15" cy="15" r="2" fill="currentColor" stroke="none" />
        <path d="M18 12l3 3m0 0l-3 3" />
        <path d="M12 18l3 3m0 0l3-3" />
    </svg>
);

// Color Palette Icon
export const PaletteIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="8" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none" />
        <path d="M15 14c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" fill="currentColor" stroke="none" />
    </svg>
);

// Watermark Icon
export const WatermarkIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
        <text x="8" y="14" fontSize="6" fill="currentColor" fontFamily="sans-serif" stroke="none" opacity="0.5">©</text>
    </svg>
);

// Favicon Generator Icon
export const FaviconIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="2" width="8" height="8" rx="1" />
        <rect x="14" y="2" width="4" height="4" rx="0.5" />
        <rect x="20" y="2" width="2" height="2" rx="0.25" />
        <path d="M6 14v4a2 2 0 002 2h4" />
        <path d="M14 14l3-3m0 0l3 3m-3-3v7" />
    </svg>
);

// JWT Decoder Icon
export const JwtIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
);

// JSON Formatter Icon
export const JsonIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M8 3H6a2 2 0 00-2 2v2" />
        <path d="M8 21H6a2 2 0 01-2-2v-2" />
        <path d="M16 3h2a2 2 0 012 2v2" />
        <path d="M16 21h2a2 2 0 002-2v-2" />
        <text x="6" y="14" fontSize="10" fill="currentColor" fontFamily="monospace" stroke="none">{`{}`}</text>
    </svg>
);

// DNS Checker Icon
export const DnsIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
);

// Nginx Config Icon
export const NginxIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 7v10" />
        <path d="M8 7l8 10" />
        <path d="M16 7v10" />
    </svg>
);

// Steganography Icon
export const StegoIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
        <text x="5" y="10" fontSize="4" stroke="none" fill="currentColor">🔒</text>
    </svg>
);

// Image Steganography Icon (LSB)
export const ImageStegoIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
        <path d="M14 3v4h4" />
        <path d="M17 8l-3-5" />
        <rect x="14" y="14" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.3" />
    </svg>
);

// Metadata / EXIF Icon
export const MetadataIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
        <path d="M15 3h6v6" />
        <path d="M10 14l5-5" />
        <circle cx="18" cy="6" r="2" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
);

// Reverse Shell Icon
export const ReverseShellIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8l4 4-4 4" />
        <path d="M12 16h6" />
    </svg>
);

// Banner ASCII Icon
export const BannerAsciiIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <text x="5" y="13" fontSize="6" fill="currentColor" fontFamily="monospace" stroke="none">Aa</text>
        <path d="M16 8h2" />
        <path d="M16 12h4" />
        <path d="M16 16h3" />
    </svg>
);

// Subnet Calculator Icon
export const SubnetIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="5" r="3" />
        <circle cx="5" cy="19" r="3" />
        <circle cx="19" cy="19" r="3" />
        <path d="M12 8v4" />
        <path d="M12 12l-5.5 5" />
        <path d="M12 12l5.5 5" />
    </svg>
);

// Redes (Networking) Category Icon
export const RedesIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="2" />
        <circle cx="4" cy="6" r="2" />
        <circle cx="20" cy="6" r="2" />
        <circle cx="4" cy="18" r="2" />
        <circle cx="20" cy="18" r="2" />
        <path d="M6 7l4 4" />
        <path d="M18 7l-4 4" />
        <path d="M6 17l4-4" />
        <path d="M18 17l-4-4" />
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

// Images Category Icon
export const ImagenesIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
    </svg>
);

// Security Category Icon
export const SeguridadIcon: FC<IconProps> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

// Tool icon mapping by slug
export const TOOL_ICONS: Record<string, FC<IconProps>> = {
    "qr": QRIcon,
    "claves": PasswordIcon,
    "unidades": ScaleIcon,
    "regex": RegexIcon,
    "base64": ImageCodeIcon,
    "ascii": AsciiArtIcon,
    "enlaces": LinkIcon,
    "aleatorio": DiceIcon,
    "impuestos": CalculatorIcon,
    "binario": BinaryIcon,
    // Image tools
    "convertir-imagen": ImageConverterIcon,
    "recortar-imagen": CropIcon,
    "quitar-fondo": BgRemoveIcon,
    "convertir-ico": IcoIcon,
    "comprimir-imagen": CompressIcon,
    "redimensionar": ResizeIcon,
    "paleta-colores": PaletteIcon,
    "marca-agua": WatermarkIcon,
    "favicon": FaviconIcon,
    // Developer tools
    "jwt": JwtIcon,
    "json": JsonIcon,
    "dns": DnsIcon,
    "nginx": NginxIcon,
    // Security tools
    "esteganografia": StegoIcon,
    "esteganografia-imagen": ImageStegoIcon,
    "metadatos": MetadataIcon,
    "reverse-shell": ReverseShellIcon,
    // Networking tools
    "banner-ascii": BannerAsciiIcon,
    "subredes": SubnetIcon,
};

// Category icon mapping - NEW CATEGORIES
export const CATEGORY_ICONS: Record<string, FC<IconProps>> = {
    "generación": GeneracionIcon,
    "conversión": ConversionIcon,
    "productividad": ProductividadIcon,
    "imágenes": ImagenesIcon,
    "seguridad": SeguridadIcon,
    "redes": RedesIcon,
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
    "imágenes": {
        name: "Imágenes",
        color: "#EC4899",
        bgColor: "from-[#EC4899]/20 to-[#EC4899]/5",
        borderColor: "border-[#EC4899]/30",
        iconBg: "from-[#EC4899]/20 to-[#EC4899]/10",
    },
    "seguridad": {
        name: "Seguridad",
        color: "#10B981",
        bgColor: "from-[#10B981]/20 to-[#10B981]/5",
        borderColor: "border-[#10B981]/30",
        iconBg: "from-[#10B981]/20 to-[#10B981]/10",
    },
    "redes": {
        name: "Redes",
        color: "#F97316",
        bgColor: "from-[#F97316]/20 to-[#F97316]/5",
        borderColor: "border-[#F97316]/30",
        iconBg: "from-[#F97316]/20 to-[#F97316]/10",
    },
};

