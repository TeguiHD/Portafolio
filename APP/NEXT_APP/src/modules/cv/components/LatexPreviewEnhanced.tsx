"use client";

import { useId, useState, useMemo } from "react";
import { ChevronDown, Copy, Download, ExternalLink } from "lucide-react";
import {
    generateLatexWithDesign,
    downloadLatex,
    copyToClipboard,
    type CvData,
} from "../utils/latex-templates-enhanced";
import { type CvDesignConfig, CV_THEMES } from "../utils/cv-design";
import { useToast } from "@/components/ui/Toast";
import { BOTON, BOTON_SEC, FOCO, INTERRUPTOR, TITULO } from "./estilos";

interface LatexPreviewEnhancedProps {
    data: CvData;
    designConfig: CvDesignConfig;
}

export function LatexPreviewEnhanced({ data, designConfig }: LatexPreviewEnhancedProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeView, setActiveView] = useState<"latex" | "info">("latex");
    const { success, error } = useToast();
    const base = useId();

    // Generate LaTeX with current design config
    const latexContent = useMemo(
        () => generateLatexWithDesign(data, designConfig),
        [data, designConfig]
    );

    // Calculate document stats
    const stats = useMemo(() => {
        const lines = latexContent.split("\n").length;
        const chars = latexContent.length;
        const sections = designConfig.sections.filter((s) => s.visible).length;
        const experienceCount = data.experience.length;
        const educationCount = data.education.length;
        const skillCategories = data.skills.length;
        const projectCount = data.projects.length;
        const certCount = data.certifications?.length || 0;
        const langCount = data.languages?.length || 0;

        return {
            lines,
            chars,
            sections,
            experienceCount,
            educationCount,
            skillCategories,
            projectCount,
            certCount,
            langCount,
        };
    }, [latexContent, designConfig.sections, data]);

    const handleCopy = async () => {
        const result = await copyToClipboard(latexContent);
        if (result) {
            success("Código LaTeX copiado al portapapeles");
        } else {
            error("Error al copiar");
        }
    };

    const handleDownload = () => {
        const safeName = data.personalInfo.name.replace(/\s+/g, "_").toLowerCase();
        const filename = `cv_${safeName}_${designConfig.theme}.tex`;
        downloadLatex(latexContent, filename);
        success(`Archivo ${filename} descargado`);
    };

    const handleOpenOverleaf = () => {
        // Submit LaTeX to Overleaf via a hidden form in the current page.
        // We create a temporary form, submit it to _blank, then remove it.
        try {
            const form = document.createElement("form");
            form.method = "POST";
            form.action = "https://www.overleaf.com/docs";
            form.target = "_blank";
            form.style.display = "none";

            const snipInput = document.createElement("input");
            snipInput.type = "hidden";
            snipInput.name = "snip";
            snipInput.value = latexContent;
            form.appendChild(snipInput);

            const engineInput = document.createElement("input");
            engineInput.type = "hidden";
            engineInput.name = "engine";
            engineInput.value = "pdflatex";
            form.appendChild(engineInput);

            document.body.appendChild(form);
            form.submit();
            // Clean up the form after submission
            setTimeout(() => document.body.removeChild(form), 1000);
            success("Abriendo en Overleaf...");
        } catch (err) {
            console.error("Overleaf open failed, falling back to download:", err);
            handleDownload();
            error("No se pudo abrir Overleaf. Se descargó el archivo .tex");
        }
    };

    const nombreArchivo = `cv_${data.personalInfo.name.replace(/\s+/g, "_").toLowerCase()}.tex`;

    return (
        <div className="space-y-10">
            <section aria-labelledby={`${base}-t`} className="space-y-6">
                <div>
                    <h2 id={`${base}-t`} className="text-xl font-semibold text-[var(--txt)]">Exportar</h2>
                    <p className="mt-1 text-sm text-[var(--mut)]">
                        Código LaTeX del CV con el tema {CV_THEMES[designConfig.theme].name}, listo para compilar.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button type="button" onClick={handleDownload} className={BOTON}>
                        <Download className="size-4" aria-hidden="true" />
                        Descargar .tex
                    </button>
                    <button type="button" onClick={handleCopy} className={BOTON_SEC}>
                        <Copy className="size-4" aria-hidden="true" />
                        Copiar código
                    </button>
                    <button type="button" onClick={handleOpenOverleaf} className={BOTON_SEC}>
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Abrir en Overleaf
                        <span className="sr-only">(se abre en otra pestaña)</span>
                    </button>
                </div>

                <dl className="grid grid-cols-2 border-y border-[var(--linea)] sm:grid-cols-4">
                    {[
                        { label: "Líneas", value: stats.lines.toLocaleString("es-CL") },
                        { label: "Secciones visibles", value: stats.sections },
                        { label: "Experiencias y proyectos", value: stats.experienceCount + stats.projectCount },
                        { label: "Caracteres", value: stats.chars.toLocaleString("es-CL") },
                    ].map((c, i) => (
                        <div
                            key={c.label}
                            className={`flex flex-col gap-1 border-[var(--linea)] py-4 ${i % 2 === 1 ? "border-l pl-4" : "pl-0.5 pr-4"} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l sm:pl-4" : ""}`}
                        >
                            <dt className="order-2 text-sm text-[var(--mut)]">{c.label}</dt>
                            <dd className="order-1 m-0 text-2xl font-bold tabular-nums tracking-[-0.03em] text-[var(--txt)]">{c.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section aria-label="Código e información" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div role="group" aria-label="Ver" className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            aria-pressed={activeView === "latex"}
                            onClick={() => setActiveView("latex")}
                            className={INTERRUPTOR}
                        >
                            Código LaTeX
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeView === "info"}
                            onClick={() => setActiveView("info")}
                            className={INTERRUPTOR}
                        >
                            Cómo compilarlo
                        </button>
                    </div>
                    {activeView === "latex" && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            aria-expanded={isExpanded}
                            aria-controls={`${base}-codigo`}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-[var(--mut)] transition-colors duration-150 hover:text-[var(--txt)] sm:min-h-10 ${FOCO}`}
                        >
                            {isExpanded ? "Mostrar menos" : "Mostrar todo"}
                            <ChevronDown
                                className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
                                aria-hidden="true"
                            />
                        </button>
                    )}
                </div>

                {activeView === "latex" ? (
                    <div className="overflow-hidden rounded-xl border border-[var(--linea)] bg-[var(--fondo-2)]">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--linea)] px-4 py-2 font-mono text-xs text-[var(--mut)]">
                            <span className="truncate">{nombreArchivo}</span>
                            <span>
                                {stats.lines} líneas · {stats.chars.toLocaleString("es-CL")} caracteres
                            </span>
                        </div>
                        <div className="relative">
                            {/* tabIndex: el bloque se desplaza de lado y debe poder recorrerse con el teclado */}
                            <pre
                                id={`${base}-codigo`}
                                tabIndex={0}
                                aria-label={`Código LaTeX de ${nombreArchivo}`}
                                className={`m-0 overflow-auto whitespace-pre p-4 font-mono text-[13px] leading-relaxed text-[var(--txt)] ${isExpanded ? "" : "max-h-96"} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--acento)]`}
                            >
                                <code>{latexContent}</code>
                            </pre>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h3 className={`${TITULO} mb-2`}>Pasos</h3>
                            <ol className="list-decimal space-y-2 border-t border-[var(--linea)] pl-5 pt-3 text-sm text-[var(--txt)] marker:font-mono marker:text-[var(--mut)]">
                                <li>Descarga el archivo .tex o copia el código.</li>
                                <li>Ábrelo en <strong>Overleaf</strong>, <strong>TeXShop</strong> o tu editor de LaTeX.</li>
                                <li>
                                    Revisa que estén los paquetes <code className="font-mono text-[var(--acento)]">fontawesome5</code>,{" "}
                                    <code className="font-mono text-[var(--acento)]">hyperref</code> y{" "}
                                    <code className="font-mono text-[var(--acento)]">geometry</code>.
                                </li>
                                <li>Compila con <strong>pdflatex</strong> o <strong>xelatex</strong>.</li>
                            </ol>
                        </div>

                        <div>
                            <h3 className={`${TITULO} mb-2`}>Paquetes que usa</h3>
                            <ul className="flex flex-wrap gap-1.5 border-t border-[var(--linea)] pt-3">
                                {["inputenc", "fontenc", "babel", "geometry", "enumitem", "hyperref", "fontawesome5", "xcolor", "fancyhdr", "lastpage"].map(
                                    (pkg) => (
                                        <li key={pkg} className="rounded-md border border-[var(--linea)] px-2 py-0.5 font-mono text-xs text-[var(--mut)]">
                                            {pkg}
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            <div>
                                <h3 className={`${TITULO} mb-2`}>Configuración actual</h3>
                                <dl className="border-t border-[var(--linea)] text-sm">
                                    {[
                                        ["Tema", CV_THEMES[designConfig.theme].name],
                                        ["Idioma", designConfig.language === "es" ? "Español" : "English"],
                                        ["Tamaño", designConfig.page.size === "a4" ? "A4" : designConfig.page.size === "letter" ? "Carta" : "Legal"],
                                        ["Formato de fecha", designConfig.dateFormat === "short" ? "Corto" : designConfig.dateFormat === "long" ? "Largo" : "Numérico"],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between gap-3 border-b border-[var(--linea)] py-2.5">
                                            <dt className="text-[var(--mut)]">{k}</dt>
                                            <dd className="m-0 text-[var(--txt)]">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <div>
                                <h3 className={`${TITULO} mb-2`}>Contenido del CV</h3>
                                <dl className="border-t border-[var(--linea)] text-sm">
                                    {[
                                        ["Experiencias", stats.experienceCount],
                                        ["Educación", stats.educationCount],
                                        ["Proyectos", stats.projectCount],
                                        ["Categorías de habilidades", stats.skillCategories],
                                        ["Certificaciones", stats.certCount],
                                        ["Idiomas", stats.langCount],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between gap-3 border-b border-[var(--linea)] py-2.5">
                                            <dt className="text-[var(--mut)]">{k}</dt>
                                            <dd className="m-0 font-mono tabular-nums text-[var(--txt)]">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
