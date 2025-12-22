// Client-safe security utilities - NO crypto or Node.js modules

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (password.length < 12) {
        errors.push('La contraseña debe tener al menos 12 caracteres')
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Debe incluir al menos una mayúscula')
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Debe incluir al menos una minúscula')
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Debe incluir al menos un número')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Debe incluir al menos un carácter especial')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Generate a simple client-side token (NOT for security, just for tracking)
 */
export function generateClientToken(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// ============================================
// CV EDITOR SECURITY UTILITIES
// ============================================

/**
 * CV field length limits (security + database constraints)
 */
export const CV_FIELD_LIMITS = {
    // Personal info
    name: 100,
    title: 150,
    email: 254,
    phone: 30,
    location: 100,
    orcid: 50,
    linkedin: 200,
    github: 200,
    website: 200,
    summary: 2000,

    // Experiences
    company: 100,
    position: 100,
    description: 2000,
    achievement: 500,

    // Education
    institution: 150,
    degree: 150,
    field: 100,

    // Projects
    projectName: 100,
    projectDescription: 1000,
    projectUrl: 500,
    projectYear: 20,
    technology: 50,

    // Skills
    category: 50,
    skill: 50,

    // Certifications
    certName: 150,
    issuer: 100,
    certUrl: 500,
    certYear: 20,

    // Languages
    language: 50,
    level: 30,

    // General
    versionName: 100,
} as const;

/**
 * CV array/collection limits (prevent DoS)
 */
export const CV_ARRAY_LIMITS = {
    experiences: 20,
    achievementsPerExperience: 10,
    education: 10,
    projects: 30,
    technologiesPerProject: 15,
    skillCategories: 15,
    skillsPerCategory: 30,
    certifications: 20,
    languages: 10,
    versionsPerUser: 10,
} as const;

/**
 * Sanitize and truncate a string field for CV
 */
export function sanitizeCvField(value: unknown, maxLength: number): string {
    if (typeof value !== 'string') {
        return '';
    }
    // Trim, limit length, and sanitize
    return sanitizeInput(value.trim().slice(0, maxLength));
}

/**
 * Sanitize an array of strings (e.g., achievements, technologies)
 */
export function sanitizeCvStringArray(
    arr: unknown,
    maxItems: number,
    maxItemLength: number
): string[] {
    if (!Array.isArray(arr)) {
        return [];
    }
    return arr
        .slice(0, maxItems)
        .filter((item): item is string => typeof item === 'string')
        .map(item => sanitizeCvField(item, maxItemLength));
}

/**
 * Validate CV personal info structure
 */
export interface CvPersonalInfoInput {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    orcid?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    summary?: string;
}

export function validateAndSanitizePersonalInfo(data: unknown): CvPersonalInfoInput {
    if (!data || typeof data !== 'object') {
        return {};
    }

    const input = data as Record<string, unknown>;

    return {
        name: sanitizeCvField(input.name, CV_FIELD_LIMITS.name),
        title: sanitizeCvField(input.title, CV_FIELD_LIMITS.title),
        email: sanitizeCvField(input.email, CV_FIELD_LIMITS.email),
        phone: sanitizeCvField(input.phone, CV_FIELD_LIMITS.phone),
        location: sanitizeCvField(input.location, CV_FIELD_LIMITS.location),
        orcid: sanitizeCvField(input.orcid, CV_FIELD_LIMITS.orcid) || undefined,
        linkedin: sanitizeCvField(input.linkedin, CV_FIELD_LIMITS.linkedin) || undefined,
        github: sanitizeCvField(input.github, CV_FIELD_LIMITS.github) || undefined,
        website: sanitizeCvField(input.website, CV_FIELD_LIMITS.website) || undefined,
        summary: sanitizeCvField(input.summary, CV_FIELD_LIMITS.summary) || undefined,
    };
}

/**
 * Check if production environment (suppress verbose logging)
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Safe console.log that only outputs in development
 */
export function devLog(...args: unknown[]): void {
    if (!isProduction()) {
        console.log(...args);
    }
}
