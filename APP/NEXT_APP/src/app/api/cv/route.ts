import { NextRequest, NextResponse } from "next/server";
import { verifySessionForApi } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
    CV_FIELD_LIMITS,
    CV_ARRAY_LIMITS,
    sanitizeCvField,
    sanitizeCvStringArray,
    devLog,
} from "@/lib/security";

// Types for incoming CV data
interface CvExperienceInput {
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
}

interface CvEducationInput {
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
}

interface CvSkillInput {
    category?: string;
    items?: string[];
}

interface CvProjectInput {
    name?: string;
    description?: string;
    technologies?: string[];
    url?: string;
    year?: string;
}

interface CvCertificationInput {
    name?: string;
    issuer?: string;
    year?: string;
    url?: string;
}

interface CvLanguageInput {
    language?: string;
    level?: string;
}

interface CvPersonalInfoInput {
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

interface CvDataInput {
    personalInfo?: CvPersonalInfoInput;
    experience?: CvExperienceInput[];
    education?: CvEducationInput[];
    skills?: CvSkillInput[];
    projects?: CvProjectInput[];
    certifications?: CvCertificationInput[];
    languages?: CvLanguageInput[];
}

// GET - List all CV versions for current user
export async function GET() {
    try {
        // DAL pattern: Verify session close to data access
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

        devLog("[CV API] Found versions:", versions.length);

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

        // DAL pattern: Verify session close to data access
        const session = await verifySessionForApi();
        if (!session) {
            devLog("[CV API] Unauthorized - no session");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        devLog("[CV API] User:", userId);

        // Check version limit per user (prevent DoS)
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
        const { name, data, latexCode, isDefault } = body as {
            name?: string;
            data?: CvDataInput;
            latexCode?: string;
            isDefault?: boolean;
        };

        devLog("[CV API] Received:", { name, hasData: !!data, isDefault });

        // Validate & sanitize name
        const sanitizedName = sanitizeCvField(name, CV_FIELD_LIMITS.versionName);
        if (!sanitizedName) {
            return NextResponse.json(
                { error: "Version name is required" },
                { status: 400 }
            );
        }

        if (!data?.personalInfo) {
            return NextResponse.json(
                { error: "Personal info is required" },
                { status: 400 }
            );
        }

        // Sanitize personal info
        const pi = data.personalInfo;
        const sanitizedPersonalInfo = {
            fullName: sanitizeCvField(pi.name, CV_FIELD_LIMITS.name),
            title: sanitizeCvField(pi.title, CV_FIELD_LIMITS.title),
            email: sanitizeCvField(pi.email, CV_FIELD_LIMITS.email),
            phone: sanitizeCvField(pi.phone, CV_FIELD_LIMITS.phone),
            location: sanitizeCvField(pi.location, CV_FIELD_LIMITS.location),
            orcid: sanitizeCvField(pi.orcid, CV_FIELD_LIMITS.orcid) || null,
            linkedin: sanitizeCvField(pi.linkedin, CV_FIELD_LIMITS.linkedin) || null,
            github: sanitizeCvField(pi.github, CV_FIELD_LIMITS.github) || null,
            website: sanitizeCvField(pi.website, CV_FIELD_LIMITS.website) || null,
            summary: sanitizeCvField(pi.summary, CV_FIELD_LIMITS.summary) || null,
        };

        // Create CV version with all related data in a transaction
        const version = await prisma.$transaction(async (tx) => {
            // If setting as default, unset others first
            if (isDefault) {
                await tx.cvVersion.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            // Create the main CV version
            const cv = await tx.cvVersion.create({
                data: {
                    name: sanitizedName,
                    ...sanitizedPersonalInfo,
                    isDefault: isDefault || false,
                    latexCode: latexCode ? sanitizeCvField(latexCode, 50000) : null,
                    userId,
                },
            });

            // Create experiences (with limits and sanitization)
            const experiences = (data.experience || []).slice(0, CV_ARRAY_LIMITS.experiences);
            if (experiences.length > 0) {
                await tx.cvExperience.createMany({
                    data: experiences.map((exp, idx) => ({
                        cvVersionId: cv.id,
                        company: sanitizeCvField(exp.company, CV_FIELD_LIMITS.company),
                        position: sanitizeCvField(exp.position, CV_FIELD_LIMITS.position),
                        startDate: sanitizeCvField(exp.startDate, 20),
                        endDate: sanitizeCvField(exp.endDate, 20) || null,
                        isCurrent: Boolean(exp.current),
                        description: sanitizeCvField(exp.description, CV_FIELD_LIMITS.description) || null,
                        achievements: sanitizeCvStringArray(
                            exp.achievements,
                            CV_ARRAY_LIMITS.achievementsPerExperience,
                            CV_FIELD_LIMITS.achievement
                        ),
                        sortOrder: idx,
                    })),
                });
            }

            // Create education (with limits and sanitization)
            const education = (data.education || []).slice(0, CV_ARRAY_LIMITS.education);
            if (education.length > 0) {
                await tx.cvEducation.createMany({
                    data: education.map((edu, idx) => ({
                        cvVersionId: cv.id,
                        institution: sanitizeCvField(edu.institution, CV_FIELD_LIMITS.institution),
                        degree: sanitizeCvField(edu.degree, CV_FIELD_LIMITS.degree),
                        field: sanitizeCvField(edu.field, CV_FIELD_LIMITS.field) || null,
                        startDate: sanitizeCvField(edu.startDate, 20),
                        endDate: sanitizeCvField(edu.endDate, 20) || null,
                        isCurrent: Boolean(edu.current),
                        sortOrder: idx,
                    })),
                });
            }

            // Create skills (with limits and sanitization)
            const skills = (data.skills || []).slice(0, CV_ARRAY_LIMITS.skillCategories);
            if (skills.length > 0) {
                await tx.cvSkillCategory.createMany({
                    data: skills.map((skill, idx) => ({
                        cvVersionId: cv.id,
                        category: sanitizeCvField(skill.category, CV_FIELD_LIMITS.category),
                        items: sanitizeCvStringArray(
                            skill.items,
                            CV_ARRAY_LIMITS.skillsPerCategory,
                            CV_FIELD_LIMITS.skill
                        ),
                        sortOrder: idx,
                    })),
                });
            }

            // Create projects (with limits and sanitization)
            const projects = (data.projects || []).slice(0, CV_ARRAY_LIMITS.projects);
            if (projects.length > 0) {
                await tx.cvProject.createMany({
                    data: projects.map((proj, idx) => ({
                        cvVersionId: cv.id,
                        name: sanitizeCvField(proj.name, CV_FIELD_LIMITS.projectName),
                        description: sanitizeCvField(proj.description, CV_FIELD_LIMITS.projectDescription) || null,
                        technologies: sanitizeCvStringArray(
                            proj.technologies,
                            CV_ARRAY_LIMITS.technologiesPerProject,
                            CV_FIELD_LIMITS.technology
                        ),
                        url: sanitizeCvField(proj.url, CV_FIELD_LIMITS.projectUrl) || null,
                        year: sanitizeCvField(proj.year, CV_FIELD_LIMITS.projectYear) || null,
                        sortOrder: idx,
                    })),
                });
            }

            // Create certifications (with limits and sanitization)
            const certifications = (data.certifications || []).slice(0, CV_ARRAY_LIMITS.certifications);
            if (certifications.length > 0) {
                await tx.cvCertification.createMany({
                    data: certifications.map((cert, idx) => ({
                        cvVersionId: cv.id,
                        name: sanitizeCvField(cert.name, CV_FIELD_LIMITS.certName),
                        issuer: sanitizeCvField(cert.issuer, CV_FIELD_LIMITS.issuer) || null,
                        year: sanitizeCvField(cert.year, CV_FIELD_LIMITS.certYear) || null,
                        url: sanitizeCvField(cert.url, CV_FIELD_LIMITS.certUrl) || null,
                        sortOrder: idx,
                    })),
                });
            }

            // Create languages (with limits and sanitization)
            const languages = (data.languages || []).slice(0, CV_ARRAY_LIMITS.languages);
            if (languages.length > 0) {
                await tx.cvLanguage.createMany({
                    data: languages.map((lang, idx) => ({
                        cvVersionId: cv.id,
                        language: sanitizeCvField(lang.language, CV_FIELD_LIMITS.language),
                        level: sanitizeCvField(lang.level, CV_FIELD_LIMITS.level),
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
