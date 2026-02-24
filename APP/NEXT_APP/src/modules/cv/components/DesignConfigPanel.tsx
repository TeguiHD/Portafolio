"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeSection === tab.id
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
                                            className={`p-4 rounded-xl border text-left transition-all ${isSelected
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
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${config.language === "es"
                                            ? "bg-accent-1/20 text-accent-1"
                                            : "bg-white/5 text-neutral-400 hover:text-white"
                                            }`}
                                    >
                                        🇪🇸 Español
                                    </button>
                                    <button
                                        onClick={() => updateConfig({ language: "en" })}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${config.language === "en"
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
                                <CustomSelect
                                    value={config.typography.lineSpacing}
                                    onChange={(value) => updateTypography("lineSpacing", value)}
                                    label="Espaciado de línea"
                                    options={[
                                        { value: "1.0", label: "Compacto (1.0)" },
                                        { value: "1.15", label: "Normal (1.15)" },
                                        { value: "1.25", label: "Amplio (1.25)" },
                                        { value: "1.5", label: "Doble (1.5)" },
                                    ]}
                                />
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
                                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${config.typography.alignment === align
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Fuente del cuerpo</label>
                                    <CustomSelect
                                        value={config.typography.fontFamily.body}
                                        onChange={(value) => updateTypography("fontFamily.body", value)}
                                        label="Fuente del cuerpo"
                                        options={[
                                            { value: "Source Sans Pro", label: "Source Sans Pro", preview: "Source Sans Pro" },
                                            { value: "Inter", label: "Inter", preview: "Inter" },
                                            { value: "Helvetica Neue", label: "Helvetica Neue", preview: "Helvetica Neue" },
                                            { value: "Charter", label: "Charter", preview: "Charter" },
                                            { value: "Poppins", label: "Poppins", preview: "Poppins" },
                                            { value: "Montserrat", label: "Montserrat", preview: "Montserrat" },
                                            { value: "Roboto", label: "Roboto", preview: "Roboto" },
                                            { value: "Open Sans", label: "Open Sans", preview: "Open Sans" },
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Fuente del nombre</label>
                                    <CustomSelect
                                        value={config.typography.fontFamily.name}
                                        onChange={(value) => updateTypography("fontFamily.name", value)}
                                        label="Fuente del nombre"
                                        options={[
                                            { value: "Source Sans Pro", label: "Source Sans Pro", preview: "Source Sans Pro" },
                                            { value: "Inter", label: "Inter", preview: "Inter" },
                                            { value: "Helvetica Neue", label: "Helvetica Neue", preview: "Helvetica Neue" },
                                            { value: "Charter", label: "Charter", preview: "Charter" },
                                            { value: "Poppins", label: "Poppins", preview: "Poppins" },
                                            { value: "Montserrat", label: "Montserrat", preview: "Montserrat" },
                                            { value: "Roboto", label: "Roboto", preview: "Roboto" },
                                            { value: "Open Sans", label: "Open Sans", preview: "Open Sans" },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Layout */}
                    {activeSection === "layout" && (
                        <div className="space-y-6">
                            {/* CV Layout Format */}
                            <div>
                                <label className="block text-sm text-neutral-400 mb-3">
                                    Formato del CV
                                </label>
                                <p className="text-xs text-neutral-500 mb-4">
                                    Elige la estructura visual de tu CV. Todos los formatos son ATS-friendly.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {(Object.keys(CV_LAYOUTS) as CvLayoutId[]).map((layoutId) => {
                                        const layout = CV_LAYOUTS[layoutId];
                                        const isSelected = config.layout === layoutId;

                                        return (
                                            <motion.button
                                                key={layoutId}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => updateConfig({ layout: layoutId })}
                                                className={`p-4 rounded-xl border text-left transition-all ${isSelected
                                                    ? "border-accent-1 bg-accent-1/10"
                                                    : "border-white/10 bg-white/5 hover:border-white/20"
                                                    }`}
                                            >
                                                {/* Layout schematic preview */}
                                                <div className="mb-3 p-2 rounded-lg bg-white/5 border border-white/10">
                                                    {layoutId === "single-column" && (
                                                        <div className="space-y-1">
                                                            <div className="h-2 bg-accent-1/40 rounded w-1/2 mx-auto" />
                                                            <div className="h-1 bg-white/20 rounded w-3/4 mx-auto" />
                                                            <div className="h-1 bg-white/10 rounded w-full" />
                                                            <div className="h-1 bg-white/10 rounded w-full" />
                                                            <div className="h-1 bg-white/10 rounded w-5/6" />
                                                            <div className="h-1 bg-white/10 rounded w-full" />
                                                            <div className="h-1 bg-white/10 rounded w-4/5" />
                                                        </div>
                                                    )}
                                                    {layoutId === "two-column-sidebar" && (
                                                        <div className="flex gap-1">
                                                            <div className="w-1/3 space-y-1">
                                                                <div className="h-1.5 bg-accent-1/40 rounded" />
                                                                <div className="h-1 bg-white/20 rounded" />
                                                                <div className="h-1 bg-white/20 rounded" />
                                                                <div className="h-1.5 bg-accent-1/40 rounded mt-1" />
                                                                <div className="h-1 bg-white/20 rounded" />
                                                                <div className="h-1 bg-white/20 rounded" />
                                                            </div>
                                                            <div className="w-2/3 space-y-1">
                                                                <div className="h-1.5 bg-accent-1/40 rounded" />
                                                                <div className="h-1 bg-white/10 rounded" />
                                                                <div className="h-1 bg-white/10 rounded" />
                                                                <div className="h-1 bg-white/10 rounded w-5/6" />
                                                                <div className="h-1.5 bg-accent-1/40 rounded mt-1" />
                                                                <div className="h-1 bg-white/10 rounded" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {layoutId === "compact-grid" && (
                                                        <div className="space-y-1">
                                                            <div className="h-2 bg-accent-1/40 rounded w-1/2 mx-auto" />
                                                            <div className="h-1 bg-white/10 rounded w-full" />
                                                            <div className="h-1 bg-white/10 rounded w-full" />
                                                            <div className="flex gap-1 mt-1">
                                                                <div className="w-1/2 space-y-0.5">
                                                                    <div className="h-1 bg-accent-1/30 rounded" />
                                                                    <div className="h-1 bg-white/10 rounded" />
                                                                    <div className="h-1 bg-white/10 rounded" />
                                                                </div>
                                                                <div className="w-1/2 space-y-0.5">
                                                                    <div className="h-1 bg-accent-1/30 rounded" />
                                                                    <div className="h-1 bg-white/10 rounded" />
                                                                    <div className="h-1 bg-white/10 rounded" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="font-medium text-white text-sm">{layout.name}</p>
                                                <p className="text-xs text-neutral-400 mt-1">
                                                    {layout.description}
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
                            </div>

                            <div className="border-t border-white/10 pt-6">

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
                                                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${config.page.size === size
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
                                <div className="mt-6">
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
                                <div className="space-y-3 mt-6">
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
                                                className={`w-12 h-6 rounded-full transition-colors ${config.page[key as keyof typeof config.page]
                                                    ? "bg-accent-1"
                                                    : "bg-white/10"
                                                    }`}
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded-full bg-white transition-transform ${config.page[key as keyof typeof config.page]
                                                        ? "translate-x-6"
                                                        : "translate-x-0.5"
                                                        }`}
                                                />
                                            </button>
                                        </label>
                                    ))}
                                </div>

                                {/* Date Format */}
                                <div className="mt-6">
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
                                                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${config.dateFormat === id
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
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${section.visible
                                            ? "bg-white/5 border-white/10"
                                            : "bg-white/2 border-white/5 opacity-60"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleSectionVisibility(section.id)}
                                                className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${section.visible
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
