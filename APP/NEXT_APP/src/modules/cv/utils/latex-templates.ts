/**
 * LaTeX Template Utilities for CV Generation
 * Generates professional LaTeX code from CV data
 */

import type { Experience } from "../components/ExperienceSection";
import type { Education } from "../components/EducationSection";
import type { Project } from "../components/ProjectsSection";
import type { SkillCategory } from "../components/SkillsSection";

export interface CvData {
    personalInfo: {
        name: string;
        title: string;
        email: string;
        phone: string;
        location: string;
        linkedin: string;
        github: string;
        summary: string;
    };
    experience: Experience[];
    education: Education[];
    skills: SkillCategory[];
    projects: Project[];
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
 * Formats a date string (YYYY-MM) to a human-readable format
 */
function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    const [year, month] = dateStr.split("-");
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthIndex = parseInt(month, 10) - 1;
    return `${months[monthIndex] || month}. ${year}`;
}

/**
 * Generates LaTeX code for the CV header section
 */
function generateHeader(personalInfo: CvData["personalInfo"]): string {
    const lines = [];

    lines.push("\\begin{center}");
    lines.push(`    {\\Huge\\textbf{${escapeLatex(personalInfo.name)}}}\\\\[0.3cm]`);
    lines.push(`    {\\large\\textit{${escapeLatex(personalInfo.title)}}}\\\\[0.2cm]`);

    // Contact info line
    const contacts = [];
    if (personalInfo.email) contacts.push(`\\href{mailto:${escapeLatex(personalInfo.email)}}{${escapeLatex(personalInfo.email)}}`);
    if (personalInfo.phone) contacts.push(escapeLatex(personalInfo.phone));
    if (personalInfo.location) contacts.push(escapeLatex(personalInfo.location));

    if (contacts.length > 0) {
        lines.push(`    ${contacts.join(" $\\bullet$ ")}\\\\[0.1cm]`);
    }

    // Social links
    const socials = [];
    if (personalInfo.linkedin) socials.push(`\\href{https://${personalInfo.linkedin.replace(/^https?:\/\//, "")}}{LinkedIn}`);
    if (personalInfo.github) socials.push(`\\href{https://${personalInfo.github.replace(/^https?:\/\//, "")}}{GitHub}`);

    if (socials.length > 0) {
        lines.push(`    ${socials.join(" $\\bullet$ ")}`);
    }

    lines.push("\\end{center}");
    lines.push("");

    return lines.join("\n");
}

/**
 * Generates LaTeX code for the summary section
 */
function generateSummary(summary: string): string {
    if (!summary) return "";

    return `\\section*{Resumen Profesional}
${escapeLatex(summary)}

`;
}

/**
 * Generates LaTeX code for the experience section
 */
function generateExperience(experience: Experience[]): string {
    if (experience.length === 0) return "";

    const lines = ["\\section*{Experiencia Laboral}"];

    experience.forEach((exp) => {
        const dateRange = exp.current
            ? `${formatDate(exp.startDate)} -- Presente`
            : `${formatDate(exp.startDate)} -- ${formatDate(exp.endDate)}`;

        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(exp.position)}}\\hfill\\textit{${dateRange}}\\\\`);
        lines.push(`\\textit{${escapeLatex(exp.company)}}\\\\[0.1cm]`);

        if (exp.description) {
            lines.push(escapeLatex(exp.description));
            lines.push("");
        }

        if (exp.achievements.length > 0) {
            lines.push("\\begin{itemize}[leftmargin=*, nosep]");
            exp.achievements.forEach((ach) => {
                lines.push(`    \\item ${escapeLatex(ach)}`);
            });
            lines.push("\\end{itemize}");
        }

        lines.push("\\vspace{0.3cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generates LaTeX code for the education section
 */
function generateEducation(education: Education[]): string {
    if (education.length === 0) return "";

    const lines = ["\\section*{Educación}"];

    education.forEach((edu) => {
        const dateRange = `${formatDate(edu.startDate)} -- ${formatDate(edu.endDate)}`;

        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(edu.degree)}}\\hfill\\textit{${dateRange}}\\\\`);
        lines.push(`\\textit{${escapeLatex(edu.institution)}}${edu.field ? ` -- ${escapeLatex(edu.field)}` : ""}`);
        lines.push("\\vspace{0.2cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generates LaTeX code for the skills section
 */
function generateSkills(skills: SkillCategory[]): string {
    if (skills.length === 0) return "";

    const lines = ["\\section*{Habilidades}"];
    lines.push("");
    lines.push("\\begin{description}[leftmargin=!, labelwidth=2.5cm]");

    skills.forEach((skill) => {
        lines.push(`    \\item[\\textbf{${escapeLatex(skill.category)}:}] ${skill.items.map(escapeLatex).join(", ")}`);
    });

    lines.push("\\end{description}");
    lines.push("");

    return lines.join("\n");
}

/**
 * Generates LaTeX code for the projects section
 */
function generateProjects(projects: Project[]): string {
    if (projects.length === 0) return "";

    const lines = ["\\section*{Proyectos Destacados}"];

    projects.forEach((proj) => {
        lines.push("");
        lines.push(`\\noindent\\textbf{${escapeLatex(proj.name)}}${proj.url ? ` -- \\href{${proj.url}}{\\textit{Ver proyecto}}` : ""}\\\\`);

        if (proj.description) {
            lines.push(escapeLatex(proj.description));
            lines.push("");
        }

        if (proj.technologies.length > 0) {
            lines.push(`\\textit{Tecnologías:} ${proj.technologies.map(escapeLatex).join(", ")}`);
        }

        lines.push("\\vspace{0.2cm}");
    });

    lines.push("");
    return lines.join("\n");
}

/**
 * Generates the complete LaTeX document
 */
export function generateLatex(data: CvData): string {
    const preamble = `\\documentclass[11pt, a4paper]{article}

% Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{fontawesome5}
\\usepackage{xcolor}

% Page setup
\\geometry{left=1.5cm, right=1.5cm, top=1.5cm, bottom=1.5cm}
\\pagestyle{empty}

% Colors
\\definecolor{accent}{HTML}{7CF2D4}
\\definecolor{linkcolor}{HTML}{2563EB}

% Hyperref setup
\\hypersetup{
    colorlinks=true,
    linkcolor=linkcolor,
    urlcolor=linkcolor
}

% Custom section style
\\renewcommand{\\section}[1]{%
    \\vspace{0.4cm}%
    {\\large\\textbf{#1}}%
    \\vspace{0.1cm}%
    \\hrule height 0.5pt%
    \\vspace{0.3cm}%
}

\\begin{document}

`;

    const content = [
        generateHeader(data.personalInfo),
        generateSummary(data.personalInfo.summary),
        generateExperience(data.experience),
        generateEducation(data.education),
        generateSkills(data.skills),
        generateProjects(data.projects),
    ].join("");

    const ending = `\\end{document}
`;

    return preamble + content + ending;
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
