/**
 * CV Design Configuration System
 * Inspired by RenderCV's extensive customization options
 * Provides theme presets, color schemes, typography, and layout options
 */

// Available themes (like RenderCV's classic, moderncv, sb2nov, etc.)
export const CV_THEMES = {
    classic: {
        name: "Clásico",
        description: "Diseño profesional tradicional, ideal para roles corporativos",
    },
    modern: {
        name: "Moderno",
        description: "Estilo contemporáneo con acentos de color",
    },
    minimal: {
        name: "Minimalista",
        description: "Limpio y simple, enfocado en el contenido",
    },
    engineering: {
        name: "Ingeniería",
        description: "Optimizado para roles técnicos y de ingeniería",
    },
    creative: {
        name: "Creativo",
        description: "Diseño distintivo para roles creativos",
    },
} as const;

export type ThemeId = keyof typeof CV_THEMES;

// Color configuration (following RenderCV's color system)
export interface CvColors {
    body: string;           // Main text color
    name: string;           // Name heading color
    headline: string;       // Title/headline color
    sectionTitles: string;  // Section header color
    links: string;          // Hyperlink color
    accent: string;         // Accent elements
    subtle: string;         // Secondary text (dates, locations)
}

// Typography options (like RenderCV's font_family settings)
export interface CvTypography {
    fontFamily: {
        body: string;
        name: string;
        headline: string;
        sectionTitles: string;
    };
    fontSize: {
        body: string;
        name: string;
        headline: string;
        sectionTitles: string;
    };
    lineSpacing: string;
    alignment: "left" | "justified" | "right";
}

// Page layout (like RenderCV's page settings)
export interface CvPageLayout {
    size: "a4" | "letter" | "legal";
    margins: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
    showFooter: boolean;
    showPageNumbers: boolean;
    showLastUpdated: boolean;
}

// Section ordering and visibility
export interface CvSectionConfig {
    id: string;
    label: string;
    visible: boolean;
    order: number;
}

// Complete design configuration
export interface CvDesignConfig {
    theme: ThemeId;
    colors: CvColors;
    typography: CvTypography;
    page: CvPageLayout;
    sections: CvSectionConfig[];
    showPhoto: boolean;
    photoPosition: "left" | "right" | "top";
    dateFormat: "short" | "long" | "numeric";
    language: "es" | "en";
}

// Default configurations for each theme
export const THEME_PRESETS: Record<ThemeId, Partial<CvDesignConfig>> = {
    classic: {
        colors: {
            body: "#000000",
            name: "#004F90",
            headline: "#004F90",
            sectionTitles: "#004F90",
            links: "#2563EB",
            accent: "#004F90",
            subtle: "#666666",
        },
        typography: {
            fontFamily: {
                body: "Source Sans Pro",
                name: "Source Sans Pro",
                headline: "Source Sans Pro",
                sectionTitles: "Source Sans Pro",
            },
            fontSize: {
                body: "11pt",
                name: "24pt",
                headline: "12pt",
                sectionTitles: "12pt",
            },
            lineSpacing: "1.15",
            alignment: "justified",
        },
    },
    modern: {
        colors: {
            body: "#1a1a2e",
            name: "#16213e",
            headline: "#0f3460",
            sectionTitles: "#e94560",
            links: "#e94560",
            accent: "#e94560",
            subtle: "#4a4a4a",
        },
        typography: {
            fontFamily: {
                body: "Inter",
                name: "Inter",
                headline: "Inter",
                sectionTitles: "Inter",
            },
            fontSize: {
                body: "10pt",
                name: "26pt",
                headline: "11pt",
                sectionTitles: "11pt",
            },
            lineSpacing: "1.2",
            alignment: "left",
        },
    },
    minimal: {
        colors: {
            body: "#333333",
            name: "#000000",
            headline: "#555555",
            sectionTitles: "#000000",
            links: "#0066cc",
            accent: "#999999",
            subtle: "#888888",
        },
        typography: {
            fontFamily: {
                body: "Helvetica Neue",
                name: "Helvetica Neue",
                headline: "Helvetica Neue",
                sectionTitles: "Helvetica Neue",
            },
            fontSize: {
                body: "10pt",
                name: "22pt",
                headline: "10pt",
                sectionTitles: "10pt",
            },
            lineSpacing: "1.1",
            alignment: "left",
        },
    },
    engineering: {
        colors: {
            body: "#000000",
            name: "#2c3e50",
            headline: "#34495e",
            sectionTitles: "#2c3e50",
            links: "#3498db",
            accent: "#3498db",
            subtle: "#7f8c8d",
        },
        typography: {
            fontFamily: {
                body: "Charter",
                name: "Charter",
                headline: "Charter",
                sectionTitles: "Charter",
            },
            fontSize: {
                body: "10pt",
                name: "20pt",
                headline: "11pt",
                sectionTitles: "11pt",
            },
            lineSpacing: "1.15",
            alignment: "justified",
        },
    },
    creative: {
        colors: {
            body: "#2d3436",
            name: "#6c5ce7",
            headline: "#a29bfe",
            sectionTitles: "#6c5ce7",
            links: "#0984e3",
            accent: "#fd79a8",
            subtle: "#636e72",
        },
        typography: {
            fontFamily: {
                body: "Poppins",
                name: "Montserrat",
                headline: "Poppins",
                sectionTitles: "Montserrat",
            },
            fontSize: {
                body: "10pt",
                name: "28pt",
                headline: "11pt",
                sectionTitles: "12pt",
            },
            lineSpacing: "1.25",
            alignment: "left",
        },
    },
};

// Default design configuration
export const DEFAULT_DESIGN_CONFIG: CvDesignConfig = {
    theme: "classic",
    colors: THEME_PRESETS.classic.colors!,
    typography: THEME_PRESETS.classic.typography!,
    page: {
        size: "a4",
        margins: {
            top: "1.5cm",
            bottom: "1.5cm",
            left: "1.5cm",
            right: "1.5cm",
        },
        showFooter: true,
        showPageNumbers: true,
        showLastUpdated: true,
    },
    sections: [
        { id: "summary", label: "Resumen Profesional", visible: true, order: 1 },
        { id: "experience", label: "Experiencia Laboral", visible: true, order: 2 },
        { id: "education", label: "Educación", visible: true, order: 3 },
        { id: "skills", label: "Habilidades", visible: true, order: 4 },
        { id: "projects", label: "Proyectos", visible: true, order: 5 },
        { id: "certifications", label: "Certificaciones", visible: false, order: 6 },
        { id: "languages", label: "Idiomas", visible: false, order: 7 },
        { id: "publications", label: "Publicaciones", visible: false, order: 8 },
    ],
    showPhoto: false,
    photoPosition: "right",
    dateFormat: "short",
    language: "es",
};

// Locale strings for multilanguage support (like RenderCV's locale system)
export const LOCALE_STRINGS = {
    es: {
        present: "Presente",
        to: "--",
        lastUpdated: "Última actualización",
        page: "Página",
        of: "de",
        month: "mes",
        months: "meses",
        year: "año",
        years: "años",
        monthAbbreviations: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
        sections: {
            summary: "Resumen Profesional",
            experience: "Experiencia Laboral",
            education: "Educación",
            skills: "Habilidades",
            projects: "Proyectos Destacados",
            certifications: "Certificaciones",
            languages: "Idiomas",
            publications: "Publicaciones",
        },
    },
    en: {
        present: "Present",
        to: "--",
        lastUpdated: "Last updated",
        page: "Page",
        of: "of",
        month: "month",
        months: "months",
        year: "year",
        years: "years",
        monthAbbreviations: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        sections: {
            summary: "Professional Summary",
            experience: "Work Experience",
            education: "Education",
            skills: "Skills",
            projects: "Projects",
            certifications: "Certifications",
            languages: "Languages",
            publications: "Publications",
        },
    },
} as const;

export type LocaleId = keyof typeof LOCALE_STRINGS;

/**
 * Get section title based on locale
 */
export function getSectionTitle(sectionId: string, locale: LocaleId = "es"): string {
    const sections = LOCALE_STRINGS[locale].sections;
    return sections[sectionId as keyof typeof sections] || sectionId;
}

/**
 * Format date according to locale and format settings
 */
export function formatDateWithLocale(
    dateStr: string,
    locale: LocaleId = "es",
    format: "short" | "long" | "numeric" = "short"
): string {
    if (!dateStr) return "";

    const [year, month] = dateStr.split("-");
    const monthIndex = parseInt(month, 10) - 1;
    const monthAbbrs = LOCALE_STRINGS[locale].monthAbbreviations;

    switch (format) {
        case "short":
            return `${monthAbbrs[monthIndex]}. ${year}`;
        case "long":
            return `${monthAbbrs[monthIndex]} ${year}`;
        case "numeric":
            return `${month}/${year}`;
        default:
            return `${monthAbbrs[monthIndex]}. ${year}`;
    }
}

/**
 * Calculate time span between two dates
 */
export function calculateTimeSpan(
    startDate: string,
    endDate: string | null,
    locale: LocaleId = "es"
): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    const strings = LOCALE_STRINGS[locale];
    const parts: string[] = [];

    if (years > 0) {
        parts.push(`${years} ${years === 1 ? strings.year : strings.years}`);
    }
    if (remainingMonths > 0) {
        parts.push(`${remainingMonths} ${remainingMonths === 1 ? strings.month : strings.months}`);
    }

    return parts.join(", ") || `1 ${strings.month}`;
}

/**
 * Apply theme preset to design config
 */
export function applyThemePreset(
    config: CvDesignConfig,
    themeId: ThemeId
): CvDesignConfig {
    const preset = THEME_PRESETS[themeId];
    return {
        ...config,
        theme: themeId,
        colors: preset.colors || config.colors,
        typography: preset.typography || config.typography,
    };
}
