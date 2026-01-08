"use client";

/**
 * CvLivePreview - Real-time HTML-based CV preview
 * Renders CV data as styled HTML matching the LaTeX output
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { CvData } from "../utils/latex-templates-enhanced";
import {
    type CvDesignConfig,
    LOCALE_STRINGS,
    formatDateWithLocale,
    getSectionTitle,
} from "../utils/cv-design";

interface CvLivePreviewProps {
    data: CvData;
    designConfig: CvDesignConfig;
    className?: string;
}

export function CvLivePreview({ data, designConfig, className = "" }: CvLivePreviewProps) {
    const [scale, setScale] = useState(0.6);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculate paper dimensions
    const paperDimensions = useMemo(() => {
        switch (designConfig.page.size) {
            case "letter":
                return { width: "8.5in", height: "11in" };
            case "legal":
                return { width: "8.5in", height: "14in" };
            case "a4":
            default:
                return { width: "210mm", height: "297mm" };
        }
    }, [designConfig.page.size]);

    // Get locale strings
    const locale = LOCALE_STRINGS[designConfig.language];

    // Build section content
    const visibleSections = designConfig.sections
        .filter((s) => s.visible)
        .sort((a, b) => a.order - b.order);

    const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 1.5));
    const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.3));
    const handleResetZoom = () => setScale(0.6);

    // Format date range helper
    const formatDateRange = (start: string, end: string | null, current?: boolean) => {
        const startFormatted = formatDateWithLocale(start, designConfig.language, designConfig.dateFormat);
        if (current || !end) {
            return `${startFormatted} ${locale.to} ${locale.present}`;
        }
        const endFormatted = formatDateWithLocale(end, designConfig.language, designConfig.dateFormat);
        return `${startFormatted} ${locale.to} ${endFormatted}`;
    };

    // Dynamic styles based on theme
    const styles = useMemo(() => ({
        paper: {
            width: paperDimensions.width,
            minHeight: paperDimensions.height,
            padding: `${designConfig.page.margins.top} ${designConfig.page.margins.right} ${designConfig.page.margins.bottom} ${designConfig.page.margins.left}`,
            fontFamily: designConfig.typography.fontFamily.body,
            fontSize: designConfig.typography.fontSize.body,
            lineHeight: designConfig.typography.lineSpacing,
            color: designConfig.colors.body,
            textAlign: designConfig.typography.alignment as "left" | "right" | "justify",
        },
        name: {
            fontFamily: designConfig.typography.fontFamily.name,
            fontSize: designConfig.typography.fontSize.name,
            color: designConfig.colors.name,
            fontWeight: 700,
        },
        headline: {
            fontFamily: designConfig.typography.fontFamily.headline,
            fontSize: designConfig.typography.fontSize.headline,
            color: designConfig.colors.headline,
        },
        sectionTitle: {
            fontFamily: designConfig.typography.fontFamily.sectionTitles,
            fontSize: designConfig.typography.fontSize.sectionTitles,
            color: designConfig.colors.sectionTitles,
            fontWeight: 700,
            borderBottom: `2px solid ${designConfig.colors.sectionTitles}`,
            paddingBottom: "4px",
            marginBottom: "12px",
            marginTop: "20px",
            textTransform: "uppercase" as const,
            letterSpacing: "0.5px",
        },
        link: {
            color: designConfig.colors.links,
            textDecoration: "none",
        },
        subtle: {
            color: designConfig.colors.subtle,
            fontSize: "0.9em",
        },
    }), [designConfig, paperDimensions]);

    if (!isMounted) {
        return (
            <div className={`flex flex-col ${className}`}>
                <div className="flex-1 bg-neutral-800 rounded-xl animate-pulse" style={{ minHeight: 500 }} />
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-white/5 border border-accent-1/10">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <svg className="w-4 h-4 text-accent-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Preview en vivo</span>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleZoomOut}
                        className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Alejar"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                    </button>
                    <button
                        onClick={handleResetZoom}
                        className="px-1.5 py-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors text-xs"
                        title="Restablecer"
                    >
                        {Math.round(scale * 100)}%
                    </button>
                    <button
                        onClick={handleZoomIn}
                        className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Acercar"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Preview container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto rounded-xl bg-neutral-600 p-4"
                style={{ maxHeight: "calc(100vh - 200px)" }}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="origin-top"
                    style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
                >
                    {/* Paper */}
                    <div
                        className="bg-white shadow-2xl mx-auto"
                        style={styles.paper}
                    >
                        {/* Header Section */}
                        <header className="mb-6">
                            <h1 style={styles.name}>{data.personalInfo.name}</h1>
                            <p style={styles.headline} className="mt-1">
                                {data.personalInfo.headline || data.personalInfo.title}
                            </p>

                            {/* Contact info */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm" style={styles.subtle}>
                                {data.personalInfo.email && (
                                    <span>📧 {data.personalInfo.email}</span>
                                )}
                                {data.personalInfo.phone && (
                                    <span>📱 {data.personalInfo.phone}</span>
                                )}
                                {data.personalInfo.location && (
                                    <span>📍 {data.personalInfo.location}</span>
                                )}
                                {data.personalInfo.website && (
                                    <a href={`https://${data.personalInfo.website}`} style={styles.link}>
                                        🌐 {data.personalInfo.website}
                                    </a>
                                )}
                            </div>

                            {/* Social networks */}
                            {data.personalInfo.socialNetworks && data.personalInfo.socialNetworks.length > 0 && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm" style={styles.subtle}>
                                    {data.personalInfo.socialNetworks.map((social: { network: string; username: string; url?: string }, i: number) => (
                                        <a key={i} href={social.url || '#'} style={styles.link}>
                                            {social.network}: {social.username}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </header>

                        {/* Sections */}
                        {visibleSections.map((section) => (
                            <section key={section.id}>
                                {section.id === "summary" && data.personalInfo.summary && (
                                    <>
                                        <h2 style={styles.sectionTitle}>
                                            {getSectionTitle("summary", designConfig.language)}
                                        </h2>
                                        <p className="text-justify">{data.personalInfo.summary}</p>
                                    </>
                                )}

                                {section.id === "experience" && data.experience.length > 0 && (
                                    <>
                                        <h2 style={styles.sectionTitle}>
                                            {getSectionTitle("experience", designConfig.language)}
                                        </h2>
                                        {data.experience.map((exp, i) => (
                                            <div key={i} className="mb-4">
                                                <div className="flex justify-between items-baseline">
                                                    <strong style={{ color: designConfig.colors.accent }}>
                                                        {exp.position}
                                                    </strong>
                                                    <span style={styles.subtle}>
                                                        {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-baseline">
                                                    <span>{exp.company}</span>
                                                </div>
                                                {exp.achievements && exp.achievements.length > 0 && (
                                                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                                                        {exp.achievements.map((h: string, j: number) => (
                                                            <li key={j}>{h}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}

                                {section.id === "education" && data.education.length > 0 && (
                                    <>
                                        <h2 style={styles.sectionTitle}>
                                            {getSectionTitle("education", designConfig.language)}
                                        </h2>
                                        {data.education.map((edu, i) => (
                                            <div key={i} className="mb-3">
                                                <div className="flex justify-between items-baseline">
                                                    <strong>{edu.degree} - {edu.field}</strong>
                                                    <span style={styles.subtle}>
                                                        {formatDateRange(edu.startDate, edu.endDate)}
                                                    </span>
                                                </div>
                                                <div>{edu.institution}</div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {section.id === "skills" && data.skills.length > 0 && (
                                    <>
                                        <h2 style={styles.sectionTitle}>
                                            {getSectionTitle("skills", designConfig.language)}
                                        </h2>
                                        <div className="grid grid-cols-2 gap-2">
                                            {data.skills.map((cat, i) => (
                                                <div key={i}>
                                                    <strong style={{ color: designConfig.colors.accent }}>
                                                        {cat.category}:
                                                    </strong>{" "}
                                                    <span>{cat.items.join(", ")}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {section.id === "projects" && data.projects.length > 0 && (
                                    <>
                                        <h2 style={styles.sectionTitle}>
                                            {getSectionTitle("projects", designConfig.language)}
                                        </h2>
                                        {data.projects.map((proj, i) => (
                                            <div key={i} className="mb-3">
                                                <div className="flex justify-between items-baseline">
                                                    <strong style={{ color: designConfig.colors.accent }}>
                                                        {proj.name}
                                                    </strong>
                                                    {proj.url && (
                                                        <a href={proj.url} style={styles.link} className="text-sm">
                                                            {proj.url}
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-sm mt-1">{proj.description}</p>
                                                {proj.technologies && proj.technologies.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {proj.technologies.map((tech, j) => (
                                                            <span
                                                                key={j}
                                                                className="px-1.5 py-0.5 text-xs rounded"
                                                                style={{
                                                                    backgroundColor: `${designConfig.colors.accent}20`,
                                                                    color: designConfig.colors.accent,
                                                                }}
                                                            >
                                                                {tech}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}

                                {section.id === "certifications" && data.certifications && data.certifications.length > 0 && (
                                    <>
                                        <h2 style={styles.sectionTitle}>
                                            {getSectionTitle("certifications", designConfig.language)}
                                        </h2>
                                        {data.certifications.map((cert, i) => (
                                            <div key={i} className="mb-2">
                                                <div className="flex justify-between items-baseline">
                                                    <strong>{cert.name}</strong>
                                                    <span style={styles.subtle}>{cert.date}</span>
                                                </div>
                                                <div style={styles.subtle}>{cert.issuer}</div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {section.id === "languages" && data.languages && data.languages.length > 0 && (
                                    <>
                                        <h2 style={styles.sectionTitle}>
                                            {getSectionTitle("languages", designConfig.language)}
                                        </h2>
                                        <div className="flex flex-wrap gap-4">
                                            {data.languages.map((lang: { name: string; level?: string }, i: number) => (
                                                <div key={i}>
                                                    <strong>{lang.name}</strong>
                                                    {lang.level && <span style={styles.subtle}> - {lang.level}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </section>
                        ))}

                        {/* Footer */}
                        {designConfig.page.showFooter && (
                            <footer className="mt-8 pt-4 border-t text-center text-xs" style={styles.subtle}>
                                {designConfig.page.showLastUpdated && (
                                    <span>
                                        {locale.lastUpdated}: {new Date().toLocaleDateString(designConfig.language === "es" ? "es-CL" : "en-US")}
                                    </span>
                                )}
                            </footer>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Info */}
            <div className="mt-2 text-xs text-neutral-500 text-center">
                Vista previa aproximada • El PDF final puede variar ligeramente
            </div>
        </div>
    );
}

