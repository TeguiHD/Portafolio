/**
 * CV Data Validation Schema
 * Provides Zod-based validation with Spanish error messages
 */

import { z } from "zod";

// ===================================================
// Personal Info Schema
// ===================================================
export const socialNetworkSchema = z.object({
    network: z.enum(["LinkedIn", "GitHub", "GitLab", "Twitter", "Website", "ORCID", "ResearchGate", "StackOverflow"]),
    username: z.string().min(1, "El nombre de usuario es requerido"),
    url: z.string().url("URL inválida").optional().or(z.literal("")),
});

export const personalInfoSchema = z.object({
    name: z.string()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100, "El nombre no puede exceder 100 caracteres"),
    headline: z.string().max(200, "El titular no puede exceder 200 caracteres").optional(),
    title: z.string().max(200, "El título no puede exceder 200 caracteres").optional(),
    email: z.string()
        .email("Ingresa un email válido")
        .or(z.literal("")),
    phone: z.string()
        .regex(/^[\d\s+()-]*$/, "El teléfono solo puede contener números, espacios y +()-")
        .max(20, "El teléfono no puede exceder 20 caracteres")
        .optional()
        .or(z.literal("")),
    location: z.string().max(100, "La ubicación no puede exceder 100 caracteres").optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    website: z.string().url("URL inválida").optional().or(z.literal("")),
    summary: z.string()
        .max(500, "El resumen no puede exceder 500 caracteres")
        .optional(),
    socialNetworks: z.array(socialNetworkSchema).optional(),
});

// ===================================================
// Experience Schema
// ===================================================
export const experienceSchema = z.object({
    id: z.string(),
    company: z.string()
        .min(1, "La empresa es requerida")
        .max(100, "El nombre de empresa no puede exceder 100 caracteres"),
    position: z.string()
        .min(1, "El cargo es requerido")
        .max(100, "El cargo no puede exceder 100 caracteres"),
    startDate: z.string()
        .regex(/^\d{4}-\d{2}$/, "Formato de fecha inválido (YYYY-MM)"),
    endDate: z.string()
        .regex(/^\d{4}-\d{2}$/, "Formato de fecha inválido (YYYY-MM)")
        .optional()
        .or(z.literal("")),
    current: z.boolean(),
    description: z.string()
        .max(500, "La descripción no puede exceder 500 caracteres")
        .optional(),
    achievements: z.array(z.string().max(300, "Cada logro no puede exceder 300 caracteres")),
}).refine((data) => {
    if (!data.current && !data.endDate) {
        return false;
    }
    return true;
}, {
    message: "Debes indicar una fecha de fin o marcar como trabajo actual",
    path: ["endDate"],
});

// ===================================================
// Education Schema
// ===================================================
export const educationSchema = z.object({
    id: z.string(),
    institution: z.string()
        .min(1, "La institución es requerida")
        .max(150, "El nombre de institución no puede exceder 150 caracteres"),
    degree: z.string()
        .min(1, "El título es requerido")
        .max(150, "El título no puede exceder 150 caracteres"),
    field: z.string()
        .max(100, "El campo de estudio no puede exceder 100 caracteres")
        .optional(),
    startDate: z.string()
        .regex(/^\d{4}-\d{2}$/, "Formato de fecha inválido (YYYY-MM)"),
    endDate: z.string()
        .regex(/^\d{4}-\d{2}$/, "Formato de fecha inválido (YYYY-MM)")
        .optional()
        .or(z.literal("")),
});

// ===================================================
// Skills Schema
// ===================================================
export const skillCategorySchema = z.object({
    category: z.string()
        .min(1, "La categoría es requerida")
        .max(50, "La categoría no puede exceder 50 caracteres"),
    items: z.array(z.string().max(50, "Cada skill no puede exceder 50 caracteres"))
        .min(1, "Debes agregar al menos una habilidad"),
});

// ===================================================
// Projects Schema
// ===================================================
export const projectSchema = z.object({
    id: z.string(),
    name: z.string()
        .min(1, "El nombre del proyecto es requerido")
        .max(100, "El nombre no puede exceder 100 caracteres"),
    description: z.string()
        .max(500, "La descripción no puede exceder 500 caracteres")
        .optional(),
    url: z.string().url("URL inválida").optional().or(z.literal("")),
    technologies: z.array(z.string().max(30, "Cada tecnología no puede exceder 30 caracteres")),
});

// ===================================================
// Certifications Schema
// ===================================================
export const certificationSchema = z.object({
    id: z.string(),
    name: z.string()
        .min(1, "El nombre de la certificación es requerido")
        .max(150, "El nombre no puede exceder 150 caracteres"),
    issuer: z.string()
        .min(1, "El emisor es requerido")
        .max(100, "El emisor no puede exceder 100 caracteres"),
    date: z.string()
        .regex(/^\d{4}-\d{2}$/, "Formato de fecha inválido (YYYY-MM)"),
    url: z.string().url("URL inválida").optional().or(z.literal("")),
    credentialId: z.string()
        .max(50, "El ID de credencial no puede exceder 50 caracteres")
        .optional(),
});

// ===================================================
// Languages Schema
// ===================================================
export const languageSchema = z.object({
    id: z.string(),
    name: z.string()
        .min(1, "El nombre del idioma es requerido")
        .max(50, "El nombre no puede exceder 50 caracteres"),
    level: z.enum(["native", "fluent", "advanced", "intermediate", "basic"], {
        message: "Selecciona un nivel válido",
    }),
    certification: z.string()
        .max(100, "La certificación no puede exceder 100 caracteres")
        .optional(),
});

// ===================================================
// Complete CV Schema
// ===================================================
export const cvDataSchema = z.object({
    personalInfo: personalInfoSchema,
    experience: z.array(experienceSchema),
    education: z.array(educationSchema),
    skills: z.array(skillCategorySchema),
    projects: z.array(projectSchema),
    certifications: z.array(certificationSchema).optional(),
    languages: z.array(languageSchema).optional(),
    socialNetworks: z.array(socialNetworkSchema).optional(),
});

// ===================================================
// Validation Helper Functions
// ===================================================

export type ValidationErrors = {
    [key: string]: string | string[] | ValidationErrors | ValidationErrors[];
};

/**
 * Validate CV data and return formatted errors
 */
export function validateCvData(data: unknown): {
    success: boolean;
    errors: ValidationErrors;
    data?: z.infer<typeof cvDataSchema>;
} {
    const result = cvDataSchema.safeParse(data);

    if (result.success) {
        return { success: true, errors: {}, data: result.data };
    }

    // Format Zod errors into a more usable structure
    const errors: ValidationErrors = {};

    result.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (path) {
            errors[path] = issue.message;
        }
    });

    return { success: false, errors };
}

/**
 * Validate a single field and return error message
 */
export function validateField(
    schema: z.ZodSchema,
    value: unknown
): string | null {
    const result = schema.safeParse(value);
    if (result.success) return null;
    return result.error.issues[0]?.message || "Valor inválido";
}

/**
 * Get nested error from validation errors object
 */
export function getNestedError(
    errors: ValidationErrors,
    path: string
): string | null {
    const parts = path.split(".");
    let current: unknown = errors;

    for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
            current = (current as Record<string, unknown>)[part];
        } else {
            return null;
        }
    }

    return typeof current === "string" ? current : null;
}

// Export types for use in components
export type CvDataValidated = z.infer<typeof cvDataSchema>;
export type PersonalInfoValidated = z.infer<typeof personalInfoSchema>;
export type ExperienceValidated = z.infer<typeof experienceSchema>;
export type EducationValidated = z.infer<typeof educationSchema>;
export type SkillCategoryValidated = z.infer<typeof skillCategorySchema>;
export type ProjectValidated = z.infer<typeof projectSchema>;
export type CertificationValidated = z.infer<typeof certificationSchema>;
export type LanguageValidated = z.infer<typeof languageSchema>;
