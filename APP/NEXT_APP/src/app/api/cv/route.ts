import { NextRequest, NextResponse } from "next/server";
import { verifySessionForApi } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
    CV_FIELD_LIMITS,
    CV_ARRAY_LIMITS,
    devLog,
} from "@/lib/security";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Zod Schemas for Validation
const cvExperienceSchema = z.object({
    company: z.string().max(CV_FIELD_LIMITS.company),
    position: z.string().max(CV_FIELD_LIMITS.position),
    startDate: z.string().max(20),
    endDate: z.string().max(20).optional().nullable(),
    current: z.boolean().optional(),
    description: z.string().max(CV_FIELD_LIMITS.description).optional(),
    achievements: z.array(z.string().max(CV_FIELD_LIMITS.achievement)).max(CV_ARRAY_LIMITS.achievementsPerExperience).optional(),
});

const cvEducationSchema = z.object({
    institution: z.string().max(CV_FIELD_LIMITS.institution),
    degree: z.string().max(CV_FIELD_LIMITS.degree),
    field: z.string().max(CV_FIELD_LIMITS.field).optional(),
    startDate: z.string().max(20),
    endDate: z.string().max(20).optional().nullable(),
    current: z.boolean().optional(),
});

const cvSkillSchema = z.object({
    category: z.string().max(CV_FIELD_LIMITS.category).optional(),
    items: z.array(z.string().max(CV_FIELD_LIMITS.skill)).max(CV_ARRAY_LIMITS.skillsPerCategory).optional(),
});

const cvProjectSchema = z.object({
    name: z.string().max(CV_FIELD_LIMITS.projectName),
    description: z.string().max(CV_FIELD_LIMITS.projectDescription).optional(),
    technologies: z.array(z.string().max(CV_FIELD_LIMITS.technology)).max(CV_ARRAY_LIMITS.technologiesPerProject),
    url: z.string().max(CV_FIELD_LIMITS.projectUrl).optional(),
    year: z.string().max(CV_FIELD_LIMITS.projectYear).optional(),
});

const cvCertificationSchema = z.object({
    name: z.string().max(CV_FIELD_LIMITS.certName),
    issuer: z.string().max(CV_FIELD_LIMITS.issuer).optional(),
    year: z.string().max(CV_FIELD_LIMITS.certYear).optional(),
    date: z.string().max(CV_FIELD_LIMITS.certYear).optional(),  // Accept both date and year
    url: z.string().max(CV_FIELD_LIMITS.certUrl).optional(),
    credentialId: z.string().max(100).optional(),
});

const cvLanguageSchema = z.object({
    name: z.string().max(CV_FIELD_LIMITS.language).optional(),  // Accept 'name' from frontend
    language: z.string().max(CV_FIELD_LIMITS.language).optional(),  // Accept 'language' from legacy
    level: z.string().max(CV_FIELD_LIMITS.level),
    certification: z.string().max(200).optional(),
});

const cvPersonalInfoSchema = z.object({
    name: z.string().max(CV_FIELD_LIMITS.name).optional(),
    title: z.string().max(CV_FIELD_LIMITS.title).optional(),
    email: z.string().email().max(CV_FIELD_LIMITS.email).optional(),
    phone: z.string().max(CV_FIELD_LIMITS.phone).optional(),
    location: z.string().max(CV_FIELD_LIMITS.location).optional(),
    orcid: z.string().max(CV_FIELD_LIMITS.orcid).optional().nullable(),
    linkedin: z.string().max(CV_FIELD_LIMITS.linkedin).optional().nullable(),
    github: z.string().max(CV_FIELD_LIMITS.github).optional().nullable(),
    website: z.string().max(CV_FIELD_LIMITS.website).optional().nullable(),
    summary: z.string().max(CV_FIELD_LIMITS.summary).optional().nullable(),
});

const cvDataSchema = z.object({
    personalInfo: cvPersonalInfoSchema,
    experience: z.array(cvExperienceSchema).max(CV_ARRAY_LIMITS.experiences).optional(),
    education: z.array(cvEducationSchema).max(CV_ARRAY_LIMITS.education).optional(),
    skills: z.array(cvSkillSchema).max(CV_ARRAY_LIMITS.skillCategories).optional(),
    projects: z.array(cvProjectSchema).max(CV_ARRAY_LIMITS.projects).optional(),
    certifications: z.array(cvCertificationSchema).max(CV_ARRAY_LIMITS.certifications).optional(),
    languages: z.array(cvLanguageSchema).max(CV_ARRAY_LIMITS.languages).optional(),
});

const createCvVersionSchema = z.object({
    name: z.string().min(1).max(CV_FIELD_LIMITS.versionName),
    data: cvDataSchema,
    latexCode: z.string().max(50000).optional(),
    isDefault: z.boolean().optional(),
});

// GET - List all CV versions for current user
export async function GET() {
    try {
        const session = await verifySessionForApi();
        devLog("[CV API] GET - Session user:", session?.user?.id);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const versions = await prisma.cvVersion.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                name: true,
                isDefault: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(versions);
    } catch (error) {
        console.error("[CV API] List error:", error);
        return NextResponse.json(
            { error: "Failed to fetch CV versions" },
            { status: 500 }
        );
    }
}

// POST - Create new CV version
export async function POST(request: NextRequest) {
    try {
        devLog("[CV API] POST - Creating new CV version...");

        const session = await verifySessionForApi();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Check version limit per user
        const existingCount = await prisma.cvVersion.count({
            where: { userId },
        });

        if (existingCount >= CV_ARRAY_LIMITS.versionsPerUser) {
            return NextResponse.json(
                { error: `Límite de ${CV_ARRAY_LIMITS.versionsPerUser} versiones alcanzado` },
                { status: 400 }
            );
        }

        const body = await request.json();

        // Zod Validation
        const validation = createCvVersionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { name, data, latexCode, isDefault } = validation.data;

        // Create CV version transaction
        const version = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            if (isDefault) {
                await tx.cvVersion.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            const cv = await tx.cvVersion.create({
                data: {
                    name,
                    fullName: data.personalInfo.name || '',
                    title: data.personalInfo.title || '',
                    email: data.personalInfo.email || '',
                    phone: data.personalInfo.phone || '',
                    location: data.personalInfo.location || '',
                    orcid: data.personalInfo.orcid ?? null,
                    linkedin: data.personalInfo.linkedin ?? null,
                    github: data.personalInfo.github ?? null,
                    website: data.personalInfo.website ?? null,
                    summary: data.personalInfo.summary ?? null,
                    isDefault: isDefault ?? false,
                    latexCode: latexCode ?? null,
                    userId,
                },
            });

            if (data.experience && data.experience.length > 0) {
                await tx.cvExperience.createMany({
                    data: data.experience.map((exp, idx) => ({
                        cvVersionId: cv.id,
                        company: exp.company,
                        position: exp.position,
                        isCurrent: exp.current ?? false,
                        startDate: exp.startDate,
                        endDate: exp.endDate ?? null,
                        description: exp.description ?? null,
                        achievements: exp.achievements ?? [],
                        sortOrder: idx,
                    })),
                });
            }

            if (data.education && data.education.length > 0) {
                await tx.cvEducation.createMany({
                    data: data.education.map((edu, idx) => ({
                        cvVersionId: cv.id,
                        institution: edu.institution,
                        degree: edu.degree,
                        isCurrent: edu.current ?? false,
                        field: edu.field ?? null,
                        startDate: edu.startDate,
                        endDate: edu.endDate ?? null,
                        sortOrder: idx,
                    })),
                });
            }

            if (data.skills && data.skills.length > 0) {
                await tx.cvSkillCategory.createMany({
                    data: data.skills.map((skill, idx) => ({
                        cvVersionId: cv.id,
                        category: skill.category || "General",
                        items: skill.items || [],
                        sortOrder: idx,
                    })),
                });
            }

            if (data.projects && data.projects.length > 0) {
                await tx.cvProject.createMany({
                    data: data.projects.map((proj, idx) => ({
                        cvVersionId: cv.id,
                        name: proj.name,
                        technologies: proj.technologies,
                        description: proj.description ?? null,
                        url: proj.url ?? null,
                        year: proj.year ?? null,
                        sortOrder: idx,
                    })),
                });
            }

            if (data.certifications && data.certifications.length > 0) {
                await tx.cvCertification.createMany({
                    data: data.certifications.map((cert, idx) => ({
                        cvVersionId: cv.id,
                        name: cert.name,
                        issuer: cert.issuer ?? null,
                        year: cert.date ?? cert.year ?? null,  // Accept both date and year
                        url: cert.url ?? null,
                        sortOrder: idx,
                    })),
                });
            }

            if (data.languages && data.languages.length > 0) {
                await tx.cvLanguage.createMany({
                    data: data.languages.map((lang, idx) => ({
                        cvVersionId: cv.id,
                        language: lang.name ?? lang.language ?? "",  // Accept both name and language
                        level: lang.level,
                        sortOrder: idx,
                    })),
                });
            }

            return cv;
        });

        devLog("[CV API] Version created:", version.id);
        return NextResponse.json(version, { status: 201 });
    } catch (error) {
        console.error("[CV API] Create error:", error);
        return NextResponse.json(
            { error: "Failed to create CV version" },
            { status: 500 }
        );
    }
}
