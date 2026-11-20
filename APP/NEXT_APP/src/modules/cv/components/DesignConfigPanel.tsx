"use client";

import { useState, useCallback, useId } from "react";
import { ArrowDown, ArrowUp, Check, RotateCcw } from "lucide-react";
import {
    type CvDesignConfig,
    type ThemeId,
    type CvLayoutId,
    CV_THEMES,
    CV_LAYOUTS,
    THEME_PRESETS,
    DEFAULT_DESIGN_CONFIG,
    applyThemePreset,
} from "../utils/cv-design";
import { CustomSelect } from "./CustomSelect";
import { BOTON_SEC, CAMPO, ETIQUETA, FOCO, INTERRUPTOR, TITULO } from "./estilos";

const OPCION = `flex flex-col items-start rounded-xl border border-[var(--linea-2)] p-4 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] aria-pressed:border-[var(--acento)] aria-pressed:bg-[color-mix(in_srgb,var(--acento)_10%,transparent)] ${FOCO}`;
const RAYA = "h-1 rounded bg-[var(--linea-2)]";
const RAYA_ACENTO = "rounded bg-[color-mix(in_srgb,var(--acento)_50%,transparent)]";

const FUENTES = ["Source Sans Pro", "Inter", "Helvetica Neue", "Charter", "Poppins", "Montserrat", "Roboto", "Open Sans"].map(
    (f) => ({ value: f, label: f, preview: f })
);

interface DesignConfigPanelProps {
    config: CvDesignConfig;
    onChange: (config: CvDesignConfig) => void;
}

export function DesignConfigPanel({ config, onChange }: DesignConfigPanelProps) {
    const [activeSection, setActiveSection] = useState<"theme" | "colors" | "typography" | "layout" | "sections">("theme");
    const base = useId();

    const updateConfig = useCallback(
        (updates: Partial<CvDesignConfig>) => {
            onChange({ ...config, ...updates });
        },
        [config, onChange]
    );

    const updateColors = useCallback(
        (colorKey: keyof CvDesignConfig["colors"], value: string) => {
            onChange({
                ...config,
                colors: { ...config.colors, [colorKey]: value },
            });
        },
        [config, onChange]
    );

    const updateTypography = useCallback(
        (key: string, value: string) => {
            const [section, field] = key.split(".");
            if (section === "fontFamily" || section === "fontSize") {
                onChange({
                    ...config,
                    typography: {
                        ...config.typography,
                        [section]: {
                            ...config.typography[section as "fontFamily" | "fontSize"],
                            [field]: value,
                        },
                    },
                });
            } else {
                onChange({
                    ...config,
                    typography: {
                        ...config.typography,
                        [key]: value,
                    },
                });
            }
        },
        [config, onChange]
    );

    const updatePageLayout = useCallback(
        (key: string, value: string | boolean) => {
            if (key.startsWith("margins.")) {
                const marginKey = key.replace("margins.", "") as keyof CvDesignConfig["page"]["margins"];
                onChange({
                    ...config,
                    page: {
                        ...config.page,
                        margins: { ...config.page.margins, [marginKey]: value },
                    },
                });
            } else {
                onChange({
                    ...config,
                    page: { ...config.page, [key]: value },
                });
            }
        },
        [config, onChange]
    );

    const toggleSectionVisibility = useCallback(
        (sectionId: string) => {
            onChange({
                ...config,
                sections: config.sections.map((s) =>
                    s.id === sectionId ? { ...s, visible: !s.visible } : s
                ),
            });
        },
        [config, onChange]
    );

    const reorderSection = useCallback(
        (sectionId: string, direction: "up" | "down") => {
            // Copias de cada sección: antes se cambiaba `order` sobre los objetos de la configuración recibida.
            const sections = [...config.sections].sort((a, b) => a.order - b.order).map((s) => ({ ...s }));
            const index = sections.findIndex((s) => s.id === sectionId);
            if (
                (direction === "up" && index === 0) ||
                (direction === "down" && index === sections.length - 1)
            ) {
                return;
            }

            const newIndex = direction === "up" ? index - 1 : index + 1;
            const temp = sections[index].order;
            sections[index].order = sections[newIndex].order;
            sections[newIndex].order = temp;

            onChange({ ...config, sections });
        },
        [config, onChange]
    );

    const handleThemeChange = (themeId: ThemeId) => {
        onChange(applyThemePreset(config, themeId));
    };

    const tabs = [
        { id: "theme" as const, label: "Tema" },
        { id: "colors" as const, label: "Colores" },
        { id: "typography" as const, label: "Tipografía" },
        { id: "layout" as const, label: "Página" },
        { id: "sections" as const, label: "Secciones" },
    ];

    const seccionesOrdenadas = [...config.sections].sort((a, b) => a.order - b.order);

    return (
        <section aria-labelledby={`${base}-t`} className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 id={`${base}-t`} className="text-xl font-semibold text-[var(--txt)]">Diseño</h2>
                    <p className="mt-1 text-sm text-[var(--mut)]">Colores, tipografía y estructura del CV.</p>
                </div>
                <button type="button" onClick={() => onChange(DEFAULT_DESIGN_CONFIG)} className={BOTON_SEC}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Volver al diseño inicial
                </button>
            </div>

            <div role="group" aria-label="Parte del diseño" className="flex flex-wrap gap-2 border-b border-[var(--linea)] pb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        aria-pressed={activeSection === tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className={INTERRUPTOR}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSection === "theme" && (
                <div className="space-y-8">
                    <div>
                        <h3 className={`${TITULO} mb-3`}>Tema de partida</h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {(Object.keys(CV_THEMES) as ThemeId[]).map((themeId) => {
                                const theme = CV_THEMES[themeId];
                                const preset = THEME_PRESETS[themeId];
                                const isSelected = config.theme === themeId;

                                return (
                                    <button
                                        key={themeId}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => handleThemeChange(themeId)}
                                        className={OPCION}
                                    >
                                        {preset.colors && (
                                            <span aria-hidden="true" className="mb-3 flex gap-1">
                                                <span className="size-4 rounded-full border border-[var(--linea)]" style={{ backgroundColor: preset.colors.name }} />
                                                <span className="size-4 rounded-full border border-[var(--linea)]" style={{ backgroundColor: preset.colors.sectionTitles }} />
                                                <span className="size-4 rounded-full border border-[var(--linea)]" style={{ backgroundColor: preset.colors.accent }} />
                                            </span>
                                        )}
                                        <span className="flex w-full items-center justify-between gap-2 font-medium text-[var(--txt)]">
                                            {theme.name}
                                            {isSelected && <Check className="size-4 text-[var(--acento)]" aria-hidden="true" />}
                                        </span>
                                        <span className="mt-1 text-xs text-[var(--mut)]">{theme.description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <fieldset className="m-0 border-0 p-0">
                        <legend className={ETIQUETA}>Idioma del CV</legend>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                aria-pressed={config.language === "es"}
                                onClick={() => updateConfig({ language: "es" })}
                                className={INTERRUPTOR}
                            >
                                Español
                            </button>
                            <button
                                type="button"
                                lang="en"
                                aria-pressed={config.language === "en"}
                                onClick={() => updateConfig({ language: "en" })}
                                className={INTERRUPTOR}
                            >
                                English
                            </button>
                        </div>
                    </fieldset>
                </div>
            )}

            {activeSection === "colors" && (
                <ul className="border-t border-[var(--linea)]">
                    {Object.entries({
                        name: "Nombre",
                        headline: "Título",
                        sectionTitles: "Títulos de sección",
                        body: "Texto principal",
                        links: "Enlaces",
                        accent: "Acentos",
                        subtle: "Texto secundario",
                    }).map(([key, label]) => {
                        const colorKey = key as keyof typeof config.colors;
                        return (
                            <li key={key} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--linea)] py-3">
                                <label htmlFor={`${base}-color-${key}`} className="text-sm text-[var(--txt)]">{label}</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id={`${base}-color-${key}`}
                                        type="color"
                                        value={config.colors[colorKey]}
                                        onChange={(e) => updateColors(colorKey, e.target.value)}
                                        className={`size-11 cursor-pointer rounded-lg border border-[var(--linea-2)] bg-transparent p-1 sm:size-10 ${FOCO}`}
                                    />
                                    <span className="block w-28">
                                        <input
                                            type="text"
                                            value={config.colors[colorKey]}
                                            onChange={(e) => updateColors(colorKey, e.target.value)}
                                            aria-label={`${label}: código hexadecimal`}
                                            spellCheck={false}
                                            className={`${CAMPO} font-mono`}
                                        />
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {activeSection === "typography" && (
                <div className="space-y-6">
                    <div className="max-w-sm">
                        <label htmlFor={`${base}-interlineado`} className={ETIQUETA}>Espaciado de línea</label>
                        <CustomSelect
                            id={`${base}-interlineado`}
                            value={config.typography.lineSpacing}
                            onChange={(value) => updateTypography("lineSpacing", value)}
                            label="Espaciado de línea"
                            options={[
                                { value: "1.0", label: "Compacto (1,0)" },
                                { value: "1.15", label: "Normal (1,15)" },
                                { value: "1.25", label: "Amplio (1,25)" },
                                { value: "1.5", label: "Doble (1,5)" },
                            ]}
                        />
                    </div>

                    <fieldset className="m-0 border-0 p-0">
                        <legend className={ETIQUETA}>Alineación del texto</legend>
                        <div className="flex flex-wrap gap-2">
                            {(["left", "justified", "right"] as const).map((align) => (
                                <button
                                    key={align}
                                    type="button"
                                    aria-pressed={config.typography.alignment === align}
                                    onClick={() => updateTypography("alignment", align)}
                                    className={INTERRUPTOR}
                                >
                                    {align === "left" && "Izquierda"}
                                    {align === "justified" && "Justificado"}
                                    {align === "right" && "Derecha"}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`${base}-fuente-cuerpo`} className={ETIQUETA}>Fuente del cuerpo</label>
                            <CustomSelect
                                id={`${base}-fuente-cuerpo`}
                                value={config.typography.fontFamily.body}
                                onChange={(value) => updateTypography("fontFamily.body", value)}
                                label="Fuente del cuerpo"
                                options={FUENTES}
                            />
                        </div>
                        <div>
                            <label htmlFor={`${base}-fuente-nombre`} className={ETIQUETA}>Fuente del nombre</label>
                            <CustomSelect
                                id={`${base}-fuente-nombre`}
                                value={config.typography.fontFamily.name}
                                onChange={(value) => updateTypography("fontFamily.name", value)}
                                label="Fuente del nombre"
                                options={FUENTES}
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeSection === "layout" && (
                <div className="space-y-8">
                    <div>
                        <h3 className={`${TITULO} mb-1`}>Formato del CV</h3>
                        <p className="mb-3 text-sm text-[var(--mut)]">
                            La estructura de la hoja. Los tres usan texto real, que los lectores automáticos de CV pueden leer.
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {(Object.keys(CV_LAYOUTS) as CvLayoutId[]).map((layoutId) => {
                                const layout = CV_LAYOUTS[layoutId];
                                const isSelected = config.layout === layoutId;

                                return (
                                    <button
                                        key={layoutId}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => updateConfig({ layout: layoutId })}
                                        className={OPCION}
                                    >
                                        <span aria-hidden="true" className="mb-3 block w-full rounded-lg border border-[var(--linea)] bg-[var(--fondo-2)] p-2">
                                            {layoutId === "single-column" && (
                                                <span className="block space-y-1">
                                                    <span className={`mx-auto block h-2 w-1/2 ${RAYA_ACENTO}`} />
                                                    <span className={`mx-auto block w-3/4 ${RAYA}`} />
                                                    <span className={`block w-full ${RAYA}`} />
                                                    <span className={`block w-full ${RAYA}`} />
                                                    <span className={`block w-5/6 ${RAYA}`} />
                                                    <span className={`block w-full ${RAYA}`} />
                                                    <span className={`block w-4/5 ${RAYA}`} />
                                                </span>
                                            )}
                                            {layoutId === "two-column-sidebar" && (
                                                <span className="flex gap-1">
                                                    <span className="block w-1/3 space-y-1">
                                                        <span className={`block h-1.5 ${RAYA_ACENTO}`} />
                                                        <span className={`block ${RAYA}`} />
                                                        <span className={`block ${RAYA}`} />
                                                        <span className={`mt-1 block h-1.5 ${RAYA_ACENTO}`} />
                                                        <span className={`block ${RAYA}`} />
                                                        <span className={`block ${RAYA}`} />
                                                    </span>
                                                    <span className="block w-2/3 space-y-1">
                                                        <span className={`block h-1.5 ${RAYA_ACENTO}`} />
                                                        <span className={`block ${RAYA}`} />
                                                        <span className={`block ${RAYA}`} />
                                                        <span className={`block w-5/6 ${RAYA}`} />
                                                        <span className={`mt-1 block h-1.5 ${RAYA_ACENTO}`} />
                                                        <span className={`block ${RAYA}`} />
                                                    </span>
                                                </span>
                                            )}
                                            {layoutId === "compact-grid" && (
                                                <span className="block space-y-1">
                                                    <span className={`mx-auto block h-2 w-1/2 ${RAYA_ACENTO}`} />
                                                    <span className={`block w-full ${RAYA}`} />
                                                    <span className={`block w-full ${RAYA}`} />
                                                    <span className="mt-1 flex gap-1">
                                                        <span className="block w-1/2 space-y-0.5">
                                                            <span className={`block h-1 ${RAYA_ACENTO}`} />
                                                            <span className={`block ${RAYA}`} />
                                                            <span className={`block ${RAYA}`} />
                                                        </span>
                                                        <span className="block w-1/2 space-y-0.5">
                                                            <span className={`block h-1 ${RAYA_ACENTO}`} />
                                                            <span className={`block ${RAYA}`} />
                                                            <span className={`block ${RAYA}`} />
                                                        </span>
                                                    </span>
                                                </span>
                                            )}
                                        </span>
                                        <span className="flex w-full items-center justify-between gap-2 text-sm font-medium text-[var(--txt)]">
                                            {layout.name}
                                            {isSelected && <Check className="size-4 text-[var(--acento)]" aria-hidden="true" />}
                                        </span>
                                        <span className="mt-1 text-xs text-[var(--mut)]">{layout.description}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <fieldset className="m-0 border-0 p-0">
                        <legend className={ETIQUETA}>Tamaño de página</legend>
                        <div className="flex flex-wrap gap-2">
                            {(["a4", "letter", "legal"] as const).map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    aria-pressed={config.page.size === size}
                                    onClick={() => updatePageLayout("size", size)}
                                    className={INTERRUPTOR}
                                >
                                    {size === "a4" ? "A4" : size === "letter" ? "Carta" : "Legal"}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className="m-0 border-0 p-0">
                        <legend className={ETIQUETA}>Márgenes</legend>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {(["top", "bottom", "left", "right"] as const).map((margin) => (
                                <div key={margin}>
                                    <label htmlFor={`${base}-margen-${margin}`} className="mb-1 block text-xs text-[var(--mut)]">
                                        {margin === "top" && "Superior"}
                                        {margin === "bottom" && "Inferior"}
                                        {margin === "left" && "Izquierdo"}
                                        {margin === "right" && "Derecho"}
                                    </label>
                                    <input
                                        id={`${base}-margen-${margin}`}
                                        type="text"
                                        value={config.page.margins[margin]}
                                        onChange={(e) => updatePageLayout(`margins.${margin}`, e.target.value)}
                                        spellCheck={false}
                                        className={`${CAMPO} font-mono`}
                                    />
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    <ul className="border-t border-[var(--linea)]">
                        {[
                            { key: "showFooter", label: "Mostrar pie de página" },
                            { key: "showPageNumbers", label: "Mostrar números de página" },
                            { key: "showLastUpdated", label: "Mostrar fecha de actualización" },
                        ].map(({ key, label }) => {
                            const encendido = Boolean(config.page[key as keyof typeof config.page]);
                            return (
                                <li key={key} className="flex items-center justify-between gap-4 border-b border-[var(--linea)] py-1">
                                    <span id={`${base}-${key}`} className="text-sm text-[var(--txt)]">{label}</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={encendido}
                                        aria-labelledby={`${base}-${key}`}
                                        onClick={() => updatePageLayout(key, !encendido)}
                                        className={`inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-lg ${FOCO}`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors duration-150 ${encendido ? "bg-[var(--acento)]" : "bg-[var(--linea-2)]"}`}
                                        >
                                            <span
                                                className={`size-5 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none ${encendido ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <fieldset className="m-0 border-0 p-0">
                        <legend className={ETIQUETA}>Formato de fechas</legend>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: "short", label: "Ene. 2024" },
                                { id: "long", label: "Enero 2024" },
                                { id: "numeric", label: "01/2024" },
                            ].map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={config.dateFormat === id}
                                    onClick={() => updateConfig({ dateFormat: id as "short" | "long" | "numeric" })}
                                    className={INTERRUPTOR}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                </div>
            )}

            {activeSection === "sections" && (
                <div>
                    <p className="mb-3 text-sm text-[var(--mut)]">
                        Marca las secciones que van en el CV y cámbialas de orden con las flechas.
                    </p>
                    <ul className="border-t border-[var(--linea)]">
                        {seccionesOrdenadas.map((section, i) => (
                            <li key={section.id} className="flex items-center justify-between gap-3 border-b border-[var(--linea)] py-1">
                                <label className={`flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-sm ${section.visible ? "text-[var(--txt)]" : "text-[var(--mut)]"}`}>
                                    <input
                                        type="checkbox"
                                        checked={section.visible}
                                        onChange={() => toggleSectionVisibility(section.id)}
                                        className="size-4 accent-[var(--acento)]"
                                    />
                                    {section.label}
                                </label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => reorderSection(section.id, "up")}
                                        disabled={i === 0}
                                        aria-label={`Subir ${section.label}`}
                                        className={`inline-flex size-11 items-center justify-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] hover:text-[var(--txt)] disabled:opacity-30 sm:size-10 ${FOCO}`}
                                    >
                                        <ArrowUp className="size-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => reorderSection(section.id, "down")}
                                        disabled={i === seccionesOrdenadas.length - 1}
                                        aria-label={`Bajar ${section.label}`}
                                        className={`inline-flex size-11 items-center justify-center rounded-lg text-[var(--mut)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--txt)_4%,transparent)] hover:text-[var(--txt)] disabled:opacity-30 sm:size-10 ${FOCO}`}
                                    >
                                        <ArrowDown className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
