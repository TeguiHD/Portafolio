"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    type CvDesignConfig,
    type ThemeId,
    CV_THEMES,
    THEME_PRESETS,
    DEFAULT_DESIGN_CONFIG,
    applyThemePreset,
} from "../utils/cv-design";

interface DesignConfigPanelProps {
    config: CvDesignConfig;
    onChange: (config: CvDesignConfig) => void;
}

export function DesignConfigPanel({ config, onChange }: DesignConfigPanelProps) {
    const [activeSection, setActiveSection] = useState<"theme" | "colors" | "typography" | "layout" | "sections">("theme");

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
            const sections = [...config.sections].sort((a, b) => a.order - b.order);
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
        { id: "theme" as const, label: "Tema", icon: "🎨" },
        { id: "colors" as const, label: "Colores", icon: "🖌️" },
        { id: "typography" as const, label: "Tipografía", icon: "Aa" },
        { id: "layout" as const, label: "Diseño", icon: "📐" },
        { id: "sections" as const, label: "Secciones", icon: "📑" },
    ];

    return (
        <div className="glass-panel rounded-2xl border border-accent-1/20 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-white">Personalización de Diseño</h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Configura colores, tipografía y estructura del CV
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onChange(DEFAULT_DESIGN_CONFIG)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-neutral-400 text-sm hover:bg-white/20 transition-colors"
                >
                    Resetear
                </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                            activeSection === tab.id
                                ? "bg-accent-1/20 text-accent-1"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                >
                    {/* Theme Selection */}
                    {activeSection === "theme" && (
                        <div className="space-y-4">
                            <p className="text-sm text-neutral-400 mb-4">
                                Selecciona un tema predefinido como punto de partida
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(Object.keys(CV_THEMES) as ThemeId[]).map((themeId) => {
                                    const theme = CV_THEMES[themeId];
                                    const preset = THEME_PRESETS[themeId];
                                    const isSelected = config.theme === themeId;

                                    return (
                                        <motion.button
                                            key={themeId}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleThemeChange(themeId)}
                                            className={`p-4 rounded-xl border text-left transition-all ${
                                                isSelected
                                                    ? "border-accent-1 bg-accent-1/10"
                                                    : "border-white/10 bg-white/5 hover:border-white/20"
                                            }`}
                                        >
                                            {/* Theme preview colors */}
                                            <div className="flex gap-1 mb-3">
                                                {preset.colors && (
                                                    <>
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: preset.colors.name }}
                                                        />
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: preset.colors.sectionTitles }}
                                                        />
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: preset.colors.accent }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                            <p className="font-medium text-white">{theme.name}</p>
                                            <p className="text-xs text-neutral-400 mt-1">
                                                {theme.description}
                                            </p>
                                            {isSelected && (
                                                <div className="mt-2 flex items-center gap-1 text-accent-1 text-xs">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    Seleccionado
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Language selector */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <label className="block text-sm text-neutral-400 mb-2">
                                    Idioma del CV
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateConfig({ language: "es" })}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                            config.language === "es"
                                                ? "bg-accent-1/20 text-accent-1"
                                                : "bg-white/5 text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        🇪🇸 Español
                                    </button>
                                    <button
                                        onClick={() => updateConfig({ language: "en" })}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                            config.language === "en"
                                                ? "bg-accent-1/20 text-accent-1"
                                                : "bg-white/5 text-neutral-400 hover:text-white"
                                        }`}
                                    >
                                        🇺🇸 English
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Colors */}
                    {activeSection === "colors" && (
                        <div className="space-y-4">
                            {Object.entries({
                                name: "Color del nombre",
                                headline: "Color del título",
                                sectionTitles: "Títulos de sección",
                                body: "Texto principal",
                                links: "Enlaces",
                                accent: "Acentos",
                                subtle: "Texto secundario",
                            }).map(([key, label]) => (
                                <div key={key} className="flex items-center gap-4">
                                    <label className="text-sm text-neutral-400 w-36">{label}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={config.colors[key as keyof typeof config.colors]}
                                            onChange={(e) =>
                                                updateColors(key as keyof typeof config.colors, e.target.value)
                                            }
                                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={config.colors[key as keyof typeof config.colors]}
                                            onChange={(e) =>
                                                updateColors(key as keyof typeof config.colors, e.target.value)
                                            }
                                            className="w-24 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Typography */}
                    {activeSection === "typography" && (
                        <div className="space-y-6">
                            {/* Line Spacing */}
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">
                                    Espaciado de línea
                                </label>
                                <select
                                    value={config.typography.lineSpacing}
                                    onChange={(e) => updateTypography("lineSpacing", e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white"
                                >
                                    <option value="1.0">Compacto (1.0)</option>
                                    <option value="1.15">Normal (1.15)</option>
                                    <option value="1.25">Amplio (1.25)</option>
                                    <option value="1.5">Doble (1.5)</option>
                                </select>
                            </div>

                            {/* Alignment */}
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">
                                    Alineación del texto
                                </label>
                                <div className="flex gap-2">
                                    {(["left", "justified", "right"] as const).map((align) => (
                                        <button
                                            key={align}
                                            onClick={() => updateTypography("alignment", align)}
                                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                                config.typography.alignment === align
                                                    ? "bg-accent-1/20 text-accent-1"
                                                    : "bg-white/5 text-neutral-400 hover:text-white"
                                            }`}
                                        >
                                            {align === "left" && "Izquierda"}
                                            {align === "justified" && "Justificado"}
                                            {align === "right" && "Derecha"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Families */}
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries({
                                    "fontFamily.body": "Fuente del cuerpo",
                                    "fontFamily.name": "Fuente del nombre",
                                }).map(([key, label]) => (
                                    <div key={key}>
                                        <label className="block text-sm text-neutral-400 mb-2">{label}</label>
                                        <select
                                            value={
                                                key.includes("body")
                                                    ? config.typography.fontFamily.body
                                                    : config.typography.fontFamily.name
                                            }
                                            onChange={(e) => updateTypography(key, e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white"
                                        >
                                            <option value="Source Sans Pro">Source Sans Pro</option>
                                            <option value="Inter">Inter</option>
                                            <option value="Helvetica Neue">Helvetica Neue</option>
                                            <option value="Charter">Charter</option>
                                            <option value="Poppins">Poppins</option>
                                            <option value="Montserrat">Montserrat</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Open Sans">Open Sans</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Layout */}
                    {activeSection === "layout" && (
                        <div className="space-y-6">
                            {/* Page Size */}
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">
                                    Tamaño de página
                                </label>
                                <div className="flex gap-2">
                                    {(["a4", "letter", "legal"] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updatePageLayout("size", size)}
                                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                                config.page.size === size
                                                    ? "bg-accent-1/20 text-accent-1"
                                                    : "bg-white/5 text-neutral-400 hover:text-white"
                                            }`}
                                        >
                                            {size.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Margins */}
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Márgenes</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {(["top", "bottom", "left", "right"] as const).map((margin) => (
                                        <div key={margin}>
                                            <label className="block text-xs text-neutral-500 mb-1 capitalize">
                                                {margin === "top" && "Superior"}
                                                {margin === "bottom" && "Inferior"}
                                                {margin === "left" && "Izquierdo"}
                                                {margin === "right" && "Derecho"}
                                            </label>
                                            <input
                                                type="text"
                                                value={config.page.margins[margin]}
                                                onChange={(e) =>
                                                    updatePageLayout(`margins.${margin}`, e.target.value)
                                                }
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-3">
                                {[
                                    { key: "showFooter", label: "Mostrar pie de página" },
                                    { key: "showPageNumbers", label: "Mostrar números de página" },
                                    { key: "showLastUpdated", label: "Mostrar fecha de actualización" },
                                ].map(({ key, label }) => (
                                    <label
                                        key={key}
                                        className="flex items-center justify-between cursor-pointer group"
                                    >
                                        <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">
                                            {label}
                                        </span>
                                        <button
                                            onClick={() =>
                                                updatePageLayout(
                                                    key,
                                                    !config.page[key as keyof typeof config.page]
                                                )
                                            }
                                            className={`w-12 h-6 rounded-full transition-colors ${
                                                config.page[key as keyof typeof config.page]
                                                    ? "bg-accent-1"
                                                    : "bg-white/10"
                                            }`}
                                        >
                                            <div
                                                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                                    config.page[key as keyof typeof config.page]
                                                        ? "translate-x-6"
                                                        : "translate-x-0.5"
                                                }`}
                                            />
                                        </button>
                                    </label>
                                ))}
                            </div>

                            {/* Date Format */}
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">
                                    Formato de fechas
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { id: "short", label: "Ene. 2024" },
                                        { id: "long", label: "Enero 2024" },
                                        { id: "numeric", label: "01/2024" },
                                    ].map(({ id, label }) => (
                                        <button
                                            key={id}
                                            onClick={() => updateConfig({ dateFormat: id as "short" | "long" | "numeric" })}
                                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                                config.dateFormat === id
                                                    ? "bg-accent-1/20 text-accent-1"
                                                    : "bg-white/5 text-neutral-400 hover:text-white"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sections */}
                    {activeSection === "sections" && (
                        <div className="space-y-2">
                            <p className="text-sm text-neutral-400 mb-4">
                                Activa/desactiva secciones y reordénalas arrastrando
                            </p>
                            {config.sections
                                .sort((a, b) => a.order - b.order)
                                .map((section) => (
                                    <div
                                        key={section.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                            section.visible
                                                ? "bg-white/5 border-white/10"
                                                : "bg-white/2 border-white/5 opacity-60"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleSectionVisibility(section.id)}
                                                className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                                    section.visible
                                                        ? "bg-accent-1 text-black"
                                                        : "bg-white/10 text-transparent"
                                                }`}
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                            <span className="text-sm text-white">{section.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => reorderSection(section.id, "up")}
                                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => reorderSection(section.id, "down")}
                                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
