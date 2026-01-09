/**
 * Enhanced LaTeX Template Generator
 * Generates professional ATS-friendly LaTeX code from CV data with theme support
 * Inspired by RenderCV's templating system and ATS best practices
 */

import type { Experience } from "../components/ExperienceSection";
import type { Education } from "../components/EducationSection";
import type { Project } from "../components/ProjectsSection";
import type { SkillCategory } from "../components/SkillsSection";
import {
    type CvDesignConfig,
    type LocaleId,
    DEFAULT_DESIGN_CONFIG,
    LOCALE_STRINGS,
    formatDateWithLocale,
    calculateTimeSpan,
    getSectionTitle,
} from "./cv-design";

// Extended CV data interfaces (matching RenderCV's structure)
export interface SocialNetwork {
    network: "LinkedIn" | "GitHub" | "GitLab" | "Twitter" | "Website" | "ORCID" | "ResearchGate" | "StackOverflow";
    username: string;
    url?: string;
}

export interface CustomConnection {
    placeholder: string;
    url?: string;
    icon?: string;
}

export interface Certification {
    id: string;
    name: string;
    issuer: string;
    date: string;
    url?: string;
    credentialId?: string;
}

export interface Language {
    id: string;
    name: string;
    level: "native" | "fluent" | "advanced" | "intermediate" | "basic";
    certification?: string;
}

export interface Publication {
    id: string;
    title: string;
    authors: string[];
    journal?: string;
    date: string;
    doi?: string;
    url?: string;
}

export interface CvPersonalInfo {
    name: string;
    headline?: string; // New: Like RenderCV's headline field
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website?: string;
    photo?: string;
    summary: string;
    socialNetworks?: SocialNetwork[];
    customConnections?: CustomConnection[];
}

export interface CvData {
    personalInfo: CvPersonalInfo;
    experience: Experience[];
    education: Education[];
    skills: SkillCategory[];
    projects: Project[];
    certifications?: Certification[];
    languages?: Language[];
    publications?: Publication[];
}

// Template Context (like RenderCV's template variables)
interface TemplateContext {
    cv: CvData;
    design: CvDesignConfig;
    locale: LocaleId;
    currentDate: Date;
}

/**
 * Escapes LaTeX special characters
 */
function escapeLatex(text: string | undefined | null): string {
    if (!text) return "";
    return text
        .replace(/\\/g, "\\textbackslash{}")
        .replace(/[&%$#_{}]/g, "\\$&")
        .replace(/~/g, "\\textasciitilde{}")
        .replace(/\^/g, "\\textasciicircum{}")
        .replace(/</g, "\\textless{}")
        .replace(/>/g, "\\textgreater{}")
        .replace(/\|/g, "\\textbar{}");
}

/**
 * Converts hex color to LaTeX RGB format
 */
function hexToLatexRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "0,0,0";
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r},${g},${b}`;
}

/**
 * Safely format date - returns empty string if undefined
 */
function safeFormatDate(date: string | undefined | null, locale: LocaleId, format: "short" | "long" | "numeric"): string {
    if (!date) return "";
    return formatDateWithLocale(date, locale, format);
}

/**
 * Generate preamble with design configuration - ATS Optimized
 */
function generatePreamble(ctx: TemplateContext): string {
    const { design } = ctx;
    const pageSize = design.page.size === "letter" ? "letterpaper" : "a4paper";

    return `\\documentclass[${design.typography.fontSize.body}, ${pageSize}]{article}

% ============================================================
% ATS-Friendly CV Template
% Generated with CV Editor Pro
% Based on RenderCV best practices for ATS compatibility
% ============================================================

% Core Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[${design.language === "es" ? "spanish" : "english"}]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{fontawesome5}
\\usepackage{xcolor}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{ifthen}
\\usepackage{titlesec}

% Page Geometry - ATS Friendly Margins
\\geometry{
    top=${design.page.margins.top},
    bottom=${design.page.margins.bottom},
    left=${design.page.margins.left},
    right=${design.page.margins.right},
    includefoot
}

% Color Definitions
\\definecolor{bodycolor}{RGB}{${hexToLatexRgb(design.colors.body)}}
\\definecolor{namecolor}{RGB}{${hexToLatexRgb(design.colors.name)}}
\\definecolor{headlinecolor}{RGB}{${hexToLatexRgb(design.colors.headline)}}
\\definecolor{sectioncolor}{RGB}{${hexToLatexRgb(design.colors.sectionTitles)}}
\\definecolor{linkcolor}{RGB}{${hexToLatexRgb(design.colors.links)}}
\\definecolor{accentcolor}{RGB}{${hexToLatexRgb(design.colors.accent)}}
\\definecolor{subtlecolor}{RGB}{${hexToLatexRgb(design.colors.subtle)}}

% Hyperref Configuration - ATS Compatible
\\hypersetup{
    colorlinks=true,
    linkcolor=linkcolor,
    urlcolor=linkcolor,
    pdfborder={0 0 0},
    pdftitle={CV - ${escapeLatex(ctx.cv.personalInfo.name)}},
    pdfauthor={${escapeLatex(ctx.cv.personalInfo.name)}},
    pdfsubject={Curriculum Vitae}
}

% Typography Settings
\\color{bodycolor}
\\linespread{${design.typography.lineSpacing}}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.3em}

% Section Title Styling - Clean and ATS Readable
\\titleformat{\\section}
    {\\color{sectioncolor}\\large\\bfseries}
    {}
    {0em}
    {}
    [\\titlerule]
\\titlespacing*{\\section}{0pt}{0.8em}{0.4em}

% Custom Commands for CV Entries
\\newcommand{\\cventry}[4]{%
    \\noindent\\textbf{#1}\\hfill{\\color{subtlecolor}#2}\\\\
    \\textit{#3}\\ifthenelse{\\equal{#4}{}}{}{\\hspace{0.5em}#4}\\\\[0.15cm]%
}

% Bullet List Styling - ATS Compatible
\\setlist[itemize]{
    leftmargin=1.5em,
    nosep,
    topsep=0.2em,
    partopsep=0pt,
    itemsep=0.1em,
    label={\\textbullet}
}

% Header/Footer Configuration
${design.page.showFooter ? `
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\fancyfoot[C]{${design.page.showPageNumbers ? `{\\color{subtlecolor}\\small ${escapeLatex(ctx.cv.personalInfo.name)} \\textbar\\ ${LOCALE_STRINGS[design.language].page} \\thepage\\ ${LOCALE_STRINGS[design.language].of} \\pageref{LastPage}}` : ""}}
` : "\\pagestyle{empty}"}

\\begin{document}

`;
}

/**
 * Generate header with personal info - Professional centered layout
 */
function generateHeader(ctx: TemplateContext): string {
    const { personalInfo } = ctx.cv;
    const lines: string[] = [];

    // === CENTERED NAME (Professional Standard) ===
    lines.push("% Header Section");
    lines.push("\\begin{center}");

    // Name - Large and Bold
    lines.push(`    {\\color{namecolor}\\LARGE\\textbf{${escapeLatex(personalInfo.name || "")}}}`);
    lines.push("    \\\\[0.3em]");

    // Headline or Title - Subtle
    const headline = personalInfo.headline || personalInfo.title;
    if (headline) {
        lines.push(`    {\\color{headlinecolor}\\large ${escapeLatex(headline)}}`);
        lines.push("    \\\\[0.4em]");
    }

    // === CONTACT INFO WITH FONTAWESOME ICONS (No Emojis) ===
    const contactItems: string[] = [];

    // Location icon
    if (personalInfo.location) {
        contactItems.push(`\\faIcon{map-marker-alt}\\hspace{0.3em}${escapeLatex(personalInfo.location)}`);
    }

    // Email icon with mailto link
    if (personalInfo.email) {
        contactItems.push(`\\faIcon{envelope}\\hspace{0.3em}\\href{mailto:${personalInfo.email}}{${escapeLatex(personalInfo.email)}}`);
    }

    // Phone icon
    if (personalInfo.phone) {
        const phoneClean = personalInfo.phone.replace(/[^+0-9]/g, "");
        contactItems.push(`\\faIcon{phone}\\hspace{0.3em}\\href{tel:${phoneClean}}{${escapeLatex(personalInfo.phone)}}`);
    }

    if (contactItems.length > 0) {
        lines.push(`    {\\small ${contactItems.join("\\hspace{1em}\\textbar\\hspace{1em}")}}`);
        lines.push("    \\\\[0.25em]");
    }

    // === SOCIAL LINKS WITH PROFESSIONAL ICONS ===
    const socialItems: string[] = [];

    // LinkedIn
    if (personalInfo.linkedin) {
        const linkedinUrl = personalInfo.linkedin.startsWith("http")
            ? personalInfo.linkedin
            : `https://linkedin.com/in/${personalInfo.linkedin}`;
        const linkedinDisplay = personalInfo.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "");
        socialItems.push(`\\faIcon{linkedin}\\hspace{0.3em}\\href{${linkedinUrl}}{${escapeLatex(linkedinDisplay) || "LinkedIn"}}`);
    }

    // GitHub
    if (personalInfo.github) {
        const githubUrl = personalInfo.github.startsWith("http")
            ? personalInfo.github
            : `https://github.com/${personalInfo.github}`;
        const githubDisplay = personalInfo.github.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");
        socialItems.push(`\\faIcon{github}\\hspace{0.3em}\\href{${githubUrl}}{${escapeLatex(githubDisplay) || "GitHub"}}`);
    }

    // Website/Portfolio
    if (personalInfo.website) {
        const websiteUrl = personalInfo.website.startsWith("http")
            ? personalInfo.website
            : `https://${personalInfo.website}`;
        const websiteDisplay = personalInfo.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        socialItems.push(`\\faIcon{globe}\\hspace{0.3em}\\href{${websiteUrl}}{${escapeLatex(websiteDisplay)}}`);
    }

    // Custom connections
    if (personalInfo.customConnections) {
        personalInfo.customConnections.forEach((conn) => {
            const icon = conn.icon || "link";
            if (conn.url) {
                socialItems.push(`\\faIcon{${icon}}\\hspace{0.3em}\\href{${conn.url}}{${escapeLatex(conn.placeholder)}}`);
            } else {
                socialItems.push(`\\faIcon{${icon}}\\hspace{0.3em}${escapeLatex(conn.placeholder)}`);
            }
        });
    }

    if (socialItems.length > 0) {
        lines.push(`    {\\small ${socialItems.join("\\hspace{1em}\\textbar\\hspace{1em}")}}`);
    }

    lines.push("\\end{center}");
    lines.push("\\vspace{0.3em}");
    lines.push("");

    return lines.join("\n");
}

/**
 * Generate complete LaTeX document - ATS Optimized
 */
export function generateLatexWithDesign(
    data: CvData,
    designConfig: CvDesignConfig = DEFAULT_DESIGN_CONFIG
): string {
    const ctx: TemplateContext = {
        cv: data,
        design: designConfig,
        locale: designConfig.language,
        currentDate: new Date(),
    };

    // Get visible sections in order
    const visibleSections = designConfig.sections
        .filter((s) => s.visible)
        .sort((a, b) => a.order - b.order);

    // Section generators mapping
    const sectionGenerators: Record<string, (ctx: TemplateContext) => string> = {
        summary: generateSummary,
        experience: generateExperience,
        education: generateEducation,
        skills: generateSkills,
        projects: generateProjects,
        certifications: generateCertifications,
        languages: generateLanguages,
        publications: generatePublications,
    };

    // Build document
    let content = generatePreamble(ctx);
    content += generateHeader(ctx);

    // Generate each visible section in order
    visibleSections.forEach((section) => {
        const generator = sectionGenerators[section.id];
        if (generator) {
            content += generator(ctx);
        }
    });

    // Last updated footer (like RenderCV)
    if (designConfig.page.showLastUpdated) {
        const lastUpdatedStr = LOCALE_STRINGS[designConfig.language].lastUpdated;
        const dateStr = ctx.currentDate.toLocaleDateString(
            designConfig.language === "es" ? "es-CL" : "en-US",
            { month: "long", year: "numeric" }
        );
        content += `\n\\vfill\n{\\small\\color{subtlecolor}\\textit{${lastUpdatedStr}: ${dateStr}}}\n`;
    }

    content += `\n\\end{document}\n`;

    return content;
}

/**
 * Legacy function for backward compatibility
 */
export function generateLatex(data: CvData): string {
    return generateLatexWithDesign(data, DEFAULT_DESIGN_CONFIG);
}

/**
 * Downloads the LaTeX content as a .tex file
 */
export function downloadLatex(content: string, filename: string = "cv.tex"): void {
    const blob = new Blob([content], { type: "text/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Copies content to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(content);
        return true;
    } catch {
        return false;
    }
}

/**
 * Generate summary/profile section
 */
function generateSummary(ctx: TemplateContext): string {
    const summary = ctx.cv.personalInfo.summary;
    if (!summary || summary.trim() === "") return "";

    const sectionTitle = getSectionTitle("summary", ctx.design.language);
    return `\\section*{${sectionTitle}}
${escapeLatex(summary)}

`;
}

/**
 * Generate experience section with time spans - ATS Optimized
 */
function generateExperience(ctx: TemplateContext): string {
    const { experience } = ctx.cv;
    if (!experience || experience.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("experience", locale);
    const presentStr = LOCALE_STRINGS[locale].present;

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    experience.forEach((exp) => {
        // Safely format dates
        const startFormatted = safeFormatDate(exp.startDate, locale, dateFormat);
        const endFormatted = exp.current
            ? presentStr
            : safeFormatDate(exp.endDate, locale, dateFormat);

        // Build date range only if we have start date
        let dateRange = "";
        if (startFormatted) {
            dateRange = endFormatted
                ? `${startFormatted} -- ${endFormatted}`
                : startFormatted;
        }

        // Calculate and show time span
        const timeSpan = calculateTimeSpan(exp.startDate || "", exp.current ? null : (exp.endDate || ""), locale);

        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(exp.position || "")}}\\hfill{\\color{subtlecolor}${dateRange}}`);
        lines.push(`\\\\`);
        lines.push(`\\textit{${escapeLatex(exp.company || "")}}${timeSpan ? `\\hfill{\\color{subtlecolor}\\small (${timeSpan})}` : ""}`);
        lines.push(`\\\\[0.15em]`);

        if (exp.description) {
            lines.push(escapeLatex(exp.description));
            lines.push("");
        }

        if (exp.achievements && exp.achievements.length > 0) {
            lines.push("\\begin{itemize}");
            exp.achievements.forEach((ach) => {
                if (ach) {
                    lines.push(`    \\item ${escapeLatex(ach)}`);
                }
            });
            lines.push("\\end{itemize}");
        }

        lines.push("\\vspace{0.3em}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate education section - ATS Optimized
 */
function generateEducation(ctx: TemplateContext): string {
    const { education } = ctx.cv;
    if (!education || education.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("education", locale);

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    education.forEach((edu) => {
        const startFormatted = safeFormatDate(edu.startDate, locale, dateFormat);
        const endFormatted = safeFormatDate(edu.endDate, locale, dateFormat);

        // Build date range
        let dateRange = "";
        if (startFormatted && endFormatted) {
            dateRange = `${startFormatted} -- ${endFormatted}`;
        } else if (startFormatted || endFormatted) {
            dateRange = startFormatted || endFormatted;
        }

        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(edu.degree || "")}}${edu.field ? ` -- ${escapeLatex(edu.field)}` : ""}\\hfill{\\color{subtlecolor}${dateRange}}`);
        lines.push(`\\\\`);
        lines.push(`\\textit{${escapeLatex(edu.institution || "")}}`);
        lines.push("\\vspace{0.2em}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate skills section - ATS Optimized with keywords
 */
function generateSkills(ctx: TemplateContext): string {
    const { skills } = ctx.cv;
    if (!skills || skills.length === 0) return "";

    const sectionTitle = getSectionTitle("skills", ctx.design.language);
    const lines: string[] = [`\\section*{${sectionTitle}}`];
    lines.push("");

    // Use simple format for better ATS parsing
    skills.forEach((skill) => {
        if (skill.category && skill.items && skill.items.length > 0) {
            const items = skill.items.filter(Boolean).map(escapeLatex).join(", ");
            lines.push(`\\textbf{${escapeLatex(skill.category)}:} ${items}\\\\[0.2em]`);
        }
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate projects section - ATS Optimized
 */
function generateProjects(ctx: TemplateContext): string {
    const { projects } = ctx.cv;
    if (!projects || projects.length === 0) return "";

    const sectionTitle = getSectionTitle("projects", ctx.design.language);
    const lines: string[] = [`\\section*{${sectionTitle}}`];

    projects.forEach((proj) => {
        lines.push("");

        // Project name with optional link
        if (proj.url) {
            lines.push(`\\noindent\\textbf{\\href{${proj.url}}{${escapeLatex(proj.name || "")}}}\\hspace{0.5em}{\\small\\faIcon{external-link-alt}}`);
        } else {
            lines.push(`\\noindent\\textbf{${escapeLatex(proj.name || "")}}`);
        }
        lines.push(`\\\\[0.1em]`);

        if (proj.description) {
            lines.push(escapeLatex(proj.description));
            lines.push("");
        }

        if (proj.technologies && proj.technologies.length > 0) {
            const techList = proj.technologies.filter(Boolean).map(escapeLatex).join(", ");
            lines.push(`{\\small\\color{subtlecolor}\\textbf{Tecnologías:} ${techList}}`);
        }

        lines.push("\\vspace{0.25em}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate certifications section - ATS Optimized
 */
function generateCertifications(ctx: TemplateContext): string {
    const { certifications } = ctx.cv;
    if (!certifications || certifications.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("certifications", locale);

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    certifications.forEach((cert) => {
        const dateFormatted = safeFormatDate(cert.date, locale, dateFormat);

        lines.push("");

        // Certification with optional verification link
        if (cert.url) {
            lines.push(`\\noindent\\textbf{\\href{${cert.url}}{${escapeLatex(cert.name || "")}}}\\hspace{0.5em}{\\small\\faIcon{external-link-alt}}\\hfill{\\color{subtlecolor}${dateFormatted}}`);
        } else {
            lines.push(`\\noindent\\textbf{${escapeLatex(cert.name || "")}}\\hfill{\\color{subtlecolor}${dateFormatted}}`);
        }
        lines.push(`\\\\`);
        lines.push(`\\textit{${escapeLatex(cert.issuer || "")}}${cert.credentialId ? ` -- ID: ${escapeLatex(cert.credentialId)}` : ""}`);
        lines.push("\\vspace{0.15em}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate languages section - ATS Optimized
 */
function generateLanguages(ctx: TemplateContext): string {
    const { languages } = ctx.cv;
    if (!languages || languages.length === 0) return "";

    const sectionTitle = getSectionTitle("languages", ctx.design.language);
    const levelLabels: Record<string, Record<Language["level"], string>> = {
        es: {
            native: "Nativo",
            fluent: "Fluido",
            advanced: "Avanzado",
            intermediate: "Intermedio",
            basic: "Básico",
        },
        en: {
            native: "Native",
            fluent: "Fluent",
            advanced: "Advanced",
            intermediate: "Intermediate",
            basic: "Basic",
        },
    };

    const lines: string[] = [`\\section*{${sectionTitle}}`];
    lines.push("");

    const langItems = languages
        .filter(lang => lang.name)
        .map((lang) => {
            const levelLabel = levelLabels[ctx.design.language]?.[lang.level] || lang.level;
            const cert = lang.certification ? ` (${escapeLatex(lang.certification)})` : "";
            return `\\textbf{${escapeLatex(lang.name)}}: ${levelLabel}${cert}`;
        });

    if (langItems.length > 0) {
        lines.push(langItems.join(" \\textbar\\ "));
    }
    lines.push("");

    return lines.join("\n");
}

/**
 * Generate publications section - ATS Optimized
 */
function generatePublications(ctx: TemplateContext): string {
    const { publications } = ctx.cv;
    if (!publications || publications.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("publications", locale);

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    publications.forEach((pub) => {
        const dateFormatted = safeFormatDate(pub.date, locale, dateFormat);
        const authorList = pub.authors?.filter(Boolean).map(escapeLatex).join(", ") || "";
        const pubLink = pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : "");

        lines.push("");
        if (pubLink) {
            lines.push(`\\noindent\\href{${pubLink}}{\\textbf{${escapeLatex(pub.title || "")}}}`);
        } else {
            lines.push(`\\noindent\\textbf{${escapeLatex(pub.title || "")}}`);
        }
        lines.push(`\\\\`);
        if (authorList) {
            lines.push(`{\\small ${authorList}}`);
            lines.push(`\\\\`);
        }
        if (pub.journal) {
            lines.push(`\\textit{${escapeLatex(pub.journal)}}${dateFormatted ? `, ${dateFormatted}` : ""}`);
        }
        lines.push("\\vspace{0.15em}");
    });

    lines.push("");
    return lines.join("\n");
}
