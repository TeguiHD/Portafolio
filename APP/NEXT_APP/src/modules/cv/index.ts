/**
 * CV Module Exports
 * Central export point for all CV-related components, utilities, and types
 */

// Components
export { ExperienceSection, type Experience } from "./components/ExperienceSection";
export { EducationSection, type Education } from "./components/EducationSection";
export { ProjectsSection, type Project } from "./components/ProjectsSection";
export { SkillsSection, type SkillCategory } from "./components/SkillsSection";
export { CertificationsSection } from "./components/CertificationsSection";
export { LanguagesSection } from "./components/LanguagesSection";
export { DesignConfigPanel } from "./components/DesignConfigPanel";
export { LatexPreview } from "./components/LatexPreview";
export { LatexPreviewEnhanced } from "./components/LatexPreviewEnhanced";
export { LatexPdfPreview } from "./components/LatexPdfPreview";
export { CvAIChat, FloatingCvChat } from "./components/CvAIChat";
export { SocialNetworksEditor, AVAILABLE_NETWORKS, type NetworkType } from "./components/SocialNetworksEditor";
export { ValidatedInput, ValidatedTextarea } from "./components/ValidatedFormFields";

// Validation
export {
    cvDataSchema,
    personalInfoSchema,
    experienceSchema,
    educationSchema,
    skillCategorySchema,
    projectSchema,
    certificationSchema,
    languageSchema,
    validateCvData,
    validateField,
    getNestedError,
    type ValidationErrors,
    type CvDataValidated,
} from "./utils/cv-validation";

// Utilities - Legacy
export {
    generateLatex,
    downloadLatex,
    copyToClipboard,
    type CvData as LegacyCvData,
} from "./utils/latex-templates";

// Utilities - Enhanced (RenderCV-inspired)
export {
    generateLatexWithDesign,
    downloadLatex as downloadLatexEnhanced,
    copyToClipboard as copyToClipboardEnhanced,
    type CvData,
    type CvPersonalInfo,
    type SocialNetwork,
    type CustomConnection,
    type Certification,
    type Language,
    type Publication,
} from "./utils/latex-templates-enhanced";

// Design System
export {
    CV_THEMES,
    THEME_PRESETS,
    DEFAULT_DESIGN_CONFIG,
    LOCALE_STRINGS,
    applyThemePreset,
    getSectionTitle,
    formatDateWithLocale,
    calculateTimeSpan,
    type CvDesignConfig,
    type CvColors,
    type CvTypography,
    type CvPageLayout,
    type CvSectionConfig,
    type ThemeId,
    type LocaleId,
} from "./utils/cv-design";
