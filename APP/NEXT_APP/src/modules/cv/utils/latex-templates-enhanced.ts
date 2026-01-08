/**
 * Enhanced LaTeX Template Generator
 * Generates professional LaTeX code from CV data with theme support
 * Inspired by RenderCV's templating system
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
function escapeLatex(text: string): string {
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
 * Generate preamble with design configuration
 */
function generatePreamble(ctx: TemplateContext): string {
    const { design } = ctx;
    const pageSize = design.page.size === "letter" ? "letterpaper" : "a4paper";

    return `\\documentclass[${design.typography.fontSize.body}, ${pageSize}]{article}

% ============================================================
% Packages
% ============================================================
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
\\usepackage{graphicx}
\\usepackage{tabularx}
\\usepackage{multicol}

% ============================================================
% Page Geometry
% ============================================================
\\geometry{
    top=${design.page.margins.top},
    bottom=${design.page.margins.bottom},
    left=${design.page.margins.left},
    right=${design.page.margins.right}
}

% ============================================================
% Colors (Theme: ${design.theme})
% ============================================================
\\definecolor{bodycolor}{RGB}{${hexToLatexRgb(design.colors.body)}}
\\definecolor{namecolor}{RGB}{${hexToLatexRgb(design.colors.name)}}
\\definecolor{headlinecolor}{RGB}{${hexToLatexRgb(design.colors.headline)}}
\\definecolor{sectioncolor}{RGB}{${hexToLatexRgb(design.colors.sectionTitles)}}
\\definecolor{linkcolor}{RGB}{${hexToLatexRgb(design.colors.links)}}
\\definecolor{accentcolor}{RGB}{${hexToLatexRgb(design.colors.accent)}}
\\definecolor{subtlecolor}{RGB}{${hexToLatexRgb(design.colors.subtle)}}

% ============================================================
% Hyperref Configuration
% ============================================================
\\hypersetup{
    colorlinks=true,
    linkcolor=linkcolor,
    urlcolor=linkcolor,
    pdftitle={CV - ${escapeLatex(ctx.cv.personalInfo.name)}},
    pdfauthor={${escapeLatex(ctx.cv.personalInfo.name)}}
}

% ============================================================
% Typography
% ============================================================
\\color{bodycolor}
\\linespread{${design.typography.lineSpacing}}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

% ============================================================
% Custom Commands
% ============================================================
% Section styling
\\renewcommand{\\section}[1]{%
    \\vspace{0.5cm}%
    {\\color{sectioncolor}\\large\\textbf{#1}}%
    \\vspace{0.15cm}%
    \\hrule height 0.5pt\\relax%
    \\vspace{0.3cm}%
}

% Entry with date on right
\\newcommand{\\cventry}[4]{%
    \\noindent\\textbf{#1}\\hfill{\\color{subtlecolor}\\textit{#2}}\\\\
    \\textit{#3}#4\\\\[0.2cm]%
}

% Entry for education
\\newcommand{\\cveducation}[4]{%
    \\noindent\\textbf{#1}\\hfill{\\color{subtlecolor}\\textit{#2}}\\\\
    \\textit{#3}\\ifthenelse{\\equal{#4}{}}{}{~--~#4}\\\\[0.15cm]%
}

% Bullet list styling
\\setlist[itemize]{leftmargin=*, nosep, topsep=0pt, partopsep=0pt}

% ============================================================
% Header/Footer
% ============================================================
${design.page.showFooter ? `
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\fancyfoot[C]{${design.page.showPageNumbers ? `{\\color{subtlecolor}\\small ${escapeLatex(ctx.cv.personalInfo.name)} -- ${LOCALE_STRINGS[design.language].page} \\thepage\\ ${LOCALE_STRINGS[design.language].of} \\pageref{LastPage}}` : ""}}
` : "\\pagestyle{empty}"}

\\begin{document}

`;
}

/**
 * Generate header with personal info
 */
function generateHeader(ctx: TemplateContext): string {
    const { personalInfo } = ctx.cv;
    const { design } = ctx;
    const lines: string[] = [];

    lines.push("\\begin{center}");

    // Photo (if enabled and available)
    if (design.showPhoto && personalInfo.photo) {
        lines.push(`    \\includegraphics[width=2.5cm]{${personalInfo.photo}}\\\\[0.3cm]`);
    }

    // Name
    lines.push(`    {\\color{namecolor}\\Huge\\textbf{${escapeLatex(personalInfo.name)}}}\\\\[0.2cm]`);

    // Headline or Title
    const headline = personalInfo.headline || personalInfo.title;
    if (headline) {
        lines.push(`    {\\color{headlinecolor}\\large\\textit{${escapeLatex(headline)}}}\\\\[0.3cm]`);
    }

    // Contact info with icons
    const contacts: string[] = [];
    if (personalInfo.location) {
        contacts.push(`\\faIcon{map-marker-alt}~${escapeLatex(personalInfo.location)}`);
    }
    if (personalInfo.email) {
        contacts.push(`\\faIcon{envelope}~\\href{mailto:${personalInfo.email}}{${escapeLatex(personalInfo.email)}}`);
    }
    if (personalInfo.phone) {
        contacts.push(`\\faIcon{phone}~${escapeLatex(personalInfo.phone)}`);
    }

    if (contacts.length > 0) {
        lines.push(`    {\\small ${contacts.join(" $\\bullet$ ")}}\\\\[0.15cm]`);
    }

    // Social links with icons
    const socials: string[] = [];
    if (personalInfo.linkedin) {
        const linkedinUrl = personalInfo.linkedin.startsWith("http")
            ? personalInfo.linkedin
            : `https://${personalInfo.linkedin}`;
        socials.push(`\\faIcon{linkedin}~\\href{${linkedinUrl}}{LinkedIn}`);
    }
    if (personalInfo.github) {
        const githubUrl = personalInfo.github.startsWith("http")
            ? personalInfo.github
            : `https://${personalInfo.github}`;
        socials.push(`\\faIcon{github}~\\href{${githubUrl}}{GitHub}`);
    }
    if (personalInfo.website) {
        const websiteUrl = personalInfo.website.startsWith("http")
            ? personalInfo.website
            : `https://${personalInfo.website}`;
        socials.push(`\\faIcon{globe}~\\href{${websiteUrl}}{Portfolio}`);
    }

    // Custom connections (like RenderCV)
    if (personalInfo.customConnections) {
        personalInfo.customConnections.forEach((conn) => {
            const icon = conn.icon || "link";
            if (conn.url) {
                socials.push(`\\faIcon{${icon}}~\\href{${conn.url}}{${escapeLatex(conn.placeholder)}}`);
            } else {
                socials.push(`\\faIcon{${icon}}~${escapeLatex(conn.placeholder)}`);
            }
        });
    }

    if (socials.length > 0) {
        lines.push(`    {\\small ${socials.join(" $\\bullet$ ")}}`);
    }

    lines.push("\\end{center}");
    lines.push("");

    return lines.join("\n");
}

/**
 * Generate summary section
 */
function generateSummary(ctx: TemplateContext): string {
    const { summary } = ctx.cv.personalInfo;
    if (!summary) return "";

    const sectionTitle = getSectionTitle("summary", ctx.design.language);
    return `\\section*{${sectionTitle}}
${escapeLatex(summary)}

`;
}

/**
 * Generate experience section with time spans
 */
function generateExperience(ctx: TemplateContext): string {
    const { experience } = ctx.cv;
    if (experience.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("experience", locale);
    const presentStr = LOCALE_STRINGS[locale].present;

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    experience.forEach((exp) => {
        const startFormatted = formatDateWithLocale(exp.startDate, locale, dateFormat);
        const endFormatted = exp.current
            ? presentStr
            : formatDateWithLocale(exp.endDate, locale, dateFormat);
        const dateRange = `${startFormatted} ${LOCALE_STRINGS[locale].to} ${endFormatted}`;

        // Calculate and show time span
        const timeSpan = calculateTimeSpan(exp.startDate, exp.current ? null : exp.endDate, locale);

        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(exp.position)}}\\hfill{\\color{subtlecolor}\\textit{${dateRange}}}\\\\`);
        lines.push(`\\textit{${escapeLatex(exp.company)}}\\hfill{\\color{subtlecolor}\\small (${timeSpan})}\\\\[0.1cm]`);

        if (exp.description) {
            lines.push(escapeLatex(exp.description));
            lines.push("");
        }

        if (exp.achievements.length > 0) {
            lines.push("\\begin{itemize}");
            exp.achievements.forEach((ach) => {
                lines.push(`    \\item ${escapeLatex(ach)}`);
            });
            lines.push("\\end{itemize}");
        }

        lines.push("\\vspace{0.25cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate education section
 */
function generateEducation(ctx: TemplateContext): string {
    const { education } = ctx.cv;
    if (education.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("education", locale);

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    education.forEach((edu) => {
        const startFormatted = formatDateWithLocale(edu.startDate, locale, dateFormat);
        const endFormatted = formatDateWithLocale(edu.endDate, locale, dateFormat);
        const dateRange = `${startFormatted} ${LOCALE_STRINGS[locale].to} ${endFormatted}`;

        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(edu.degree)}}\\hfill{\\color{subtlecolor}\\textit{${dateRange}}}\\\\`);
        lines.push(`\\textit{${escapeLatex(edu.institution)}}${edu.field ? ` -- ${escapeLatex(edu.field)}` : ""}`);
        lines.push("\\vspace{0.2cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate skills section with better formatting
 */
function generateSkills(ctx: TemplateContext): string {
    const { skills } = ctx.cv;
    if (skills.length === 0) return "";

    const sectionTitle = getSectionTitle("skills", ctx.design.language);
    const lines: string[] = [`\\section*{${sectionTitle}}`];
    lines.push("");

    // Use tabular for better alignment
    lines.push("\\begin{tabular}{@{} >{}l @{\\hspace{0.5cm}} p{12cm} @{}}");

    skills.forEach((skill, index) => {
        const items = skill.items.map(escapeLatex).join(", ");
        const separator = index < skills.length - 1 ? "\\\\[0.15cm]" : "";
        lines.push(`    \\textbf{${escapeLatex(skill.category)}:} & ${items}${separator}`);
    });

    lines.push("\\end{tabular}");
    lines.push("");

    return lines.join("\n");
}

/**
 * Generate projects section
 */
function generateProjects(ctx: TemplateContext): string {
    const { projects } = ctx.cv;
    if (projects.length === 0) return "";

    const sectionTitle = getSectionTitle("projects", ctx.design.language);
    const lines: string[] = [`\\section*{${sectionTitle}}`];

    projects.forEach((proj) => {
        lines.push("");
        const projectLink = proj.url
            ? ` -- \\href{${proj.url}}{\\faIcon{external-link-alt}~\\textit{Ver proyecto}}`
            : "";
        lines.push(`\\noindent\\textbf{${escapeLatex(proj.name)}}${projectLink}\\\\`);

        if (proj.description) {
            lines.push(escapeLatex(proj.description));
            lines.push("");
        }

        if (proj.technologies.length > 0) {
            const techList = proj.technologies.map(escapeLatex).join(", ");
            lines.push(`{\\small\\color{subtlecolor}\\faIcon{code}~${techList}}`);
        }

        lines.push("\\vspace{0.2cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate certifications section (new)
 */
function generateCertifications(ctx: TemplateContext): string {
    const { certifications } = ctx.cv;
    if (!certifications || certifications.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("certifications", locale);

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    certifications.forEach((cert) => {
        const dateFormatted = formatDateWithLocale(cert.date, locale, dateFormat);
        const certLink = cert.url
            ? ` -- \\href{${cert.url}}{\\faIcon{certificate}~Ver credencial}`
            : "";

        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(cert.name)}}${certLink}\\hfill{\\color{subtlecolor}\\textit{${dateFormatted}}}\\\\`);
        lines.push(`\\textit{${escapeLatex(cert.issuer)}}${cert.credentialId ? ` -- ID: ${escapeLatex(cert.credentialId)}` : ""}`);
        lines.push("\\vspace{0.15cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate languages section (new)
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

    const langItems = languages.map((lang) => {
        const levelLabel = levelLabels[ctx.design.language][lang.level];
        const cert = lang.certification ? ` (${escapeLatex(lang.certification)})` : "";
        return `\\textbf{${escapeLatex(lang.name)}}: ${levelLabel}${cert}`;
    });

    lines.push(langItems.join(" $\\bullet$ "));
    lines.push("");

    return lines.join("\n");
}

/**
 * Generate publications section (new)
 */
function generatePublications(ctx: TemplateContext): string {
    const { publications } = ctx.cv;
    if (!publications || publications.length === 0) return "";

    const locale = ctx.design.language;
    const dateFormat = ctx.design.dateFormat;
    const sectionTitle = getSectionTitle("publications", locale);

    const lines: string[] = [`\\section*{${sectionTitle}}`];

    publications.forEach((pub) => {
        const dateFormatted = formatDateWithLocale(pub.date, locale, dateFormat);
        const authorList = pub.authors.map(escapeLatex).join(", ");
        const pubLink = pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : "");

        lines.push("");
        if (pubLink) {
            lines.push(`\\noindent\\href{${pubLink}}{\\textbf{${escapeLatex(pub.title)}}}\\\\`);
        } else {
            lines.push(`\\noindent\\textbf{${escapeLatex(pub.title)}}\\\\`);
        }
        lines.push(`{\\small ${authorList}}\\\\`);
        if (pub.journal) {
            lines.push(`\\textit{${escapeLatex(pub.journal)}}, ${dateFormatted}`);
        }
        lines.push("\\vspace{0.15cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generate complete LaTeX document
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
