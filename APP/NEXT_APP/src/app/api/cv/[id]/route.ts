import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { devLog } from "@/lib/security";

import { Prisma } from "@prisma/client";

// Define the full payload type including relations
type CvVersionWithRelations = Prisma.CvVersionGetPayload<{
    include: {
        experiences: true;
        education: true;
        skills: true;
        projects: true;
        certifications: true;
        languages: true;
    };
}>;

// Helper to transform DB data to frontend format
function transformCvVersion(version: CvVersionWithRelations) {
    return {
        id: version.id,
        name: version.name,
        isDefault: version.isDefault,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        data: {
            personalInfo: {
                name: version.fullName || "",
                // headline removed as it seems to not exist on CvVersion model
                title: version.title || "",
                email: version.email || "",
                phone: version.phone || "",
                location: version.location || "",
                orcid: version.orcid || "",
                linkedin: version.linkedin || "",
                github: version.github || "",
                website: version.website || "",
                summary: version.summary || "",
            },
            experience: version.experiences?.map((exp) => ({
                id: exp.id,
                company: exp.company || "",
                position: exp.position || "",
                startDate: exp.startDate || "",
                endDate: exp.endDate || "",
                current: exp.isCurrent || false,
                description: exp.description || "",
                achievements: exp.achievements || [],
            })) || [],
            education: version.education?.map((edu) => ({
                id: edu.id,
                institution: edu.institution || "",
                degree: edu.degree || "",
                field: edu.field || "",
                startDate: edu.startDate || "",
                endDate: edu.endDate || "",
                current: edu.isCurrent || false,
            })) || [],
            skills: version.skills?.map((skill) => ({
                category: skill.category || "",
                items: skill.items || [],
            })) || [],
            projects: version.projects?.map((proj) => ({
                id: proj.id,
                name: proj.name || "",
                description: proj.description || "",
                technologies: proj.technologies || [],
                url: proj.url || "",
                year: proj.year || "",
            })) || [],
            certifications: version.certifications?.map((cert) => ({
                id: cert.id,
                name: cert.name || "",
                issuer: cert.issuer || "",
                date: cert.year || "",
                url: cert.url || "",
                // credentialId removed if inconsistent with DB
            })) || [],
            languages: version.languages?.map((lang) => ({
                id: lang.id,
                name: lang.language || "",
                level: lang.level || "intermediate",
                // certification property processed safely if needed
            })) || [],
        },
        latexCode: version.latexCode || "",
    };
}

// GET - Get specific CV version with all related data
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        devLog("[CV API] GET by ID starting...");
        const session = await auth();
        devLog("[CV API] Session user:", session?.user?.id);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        devLog("[CV API] Looking for CV ID:", id);

        const version = await prisma.cvVersion.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
            include: {
                experiences: { orderBy: { sortOrder: "asc" } },
                education: { orderBy: { sortOrder: "asc" } },
                skills: { orderBy: { sortOrder: "asc" } },
                projects: { orderBy: { sortOrder: "asc" } },
                certifications: { orderBy: { sortOrder: "asc" } },
                languages: { orderBy: { sortOrder: "asc" } },
            },
        });

        devLog("[CV API] Found version:", version?.id, version?.name);

        if (!version) {
            return NextResponse.json({ error: "CV version not found" }, { status: 404 });
        }

        return NextResponse.json(transformCvVersion(version));
    } catch (error) {
        console.error("[CV API] Get error details:", error);
        return NextResponse.json(
            { error: "Failed to fetch CV version" },
            { status: 500 }
        );
    }
}

// PUT - Update CV version
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        devLog("[CV API] PUT - Updating CV version...");

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const { id } = await params;

        // Input types
        interface CVUpdateItem {
            company?: string;
            institution?: string;
            position?: string;
            degree?: string;
            field?: string;
            startDate: string;
            endDate?: string;
            current?: boolean;
            description?: string;
            achievements?: string[];
            category?: string;
            items?: string[];
            name?: string;
            technologies?: string[];
            url?: string;
            year?: string;
            issuer?: string;
            date?: string;
            language?: string;
            level?: string;
        }

        interface CVUpdatePayload {
            experience?: CVUpdateItem[];
            education?: CVUpdateItem[];
            skills?: CVUpdateItem[];
            projects?: CVUpdateItem[];
            certifications?: CVUpdateItem[];
            languages?: CVUpdateItem[];
            personalInfo?: {
                name: string;
                title: string;
                email: string;
                phone: string;
                location: string;
                orcid?: string;
                linkedin?: string;
                github?: string;
                website?: string;
                summary?: string;
            };
        }

        const body = await request.json();
        const { name, data, latexCode, isDefault } = body as {
            name?: string;
            data?: CVUpdatePayload;
            latexCode?: string;
            isDefault?: boolean;
        };

        devLog("[CV API] Updating version:", id);

        // Verify ownership
        const existing = await prisma.cvVersion.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "CV version not found" }, { status: 404 });
        }

        // Update in transaction
        const updated = await prisma.$transaction(async (tx) => {
            // If setting as default, unset others first
            if (isDefault) {
                await tx.cvVersion.updateMany({
                    where: { userId: userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            // Update main CV version
            const cv = await tx.cvVersion.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(isDefault !== undefined && { isDefault }),
                    ...(latexCode !== undefined && { latexCode }),
                    ...(data?.personalInfo && {
                        fullName: data.personalInfo.name,
                        title: data.personalInfo.title,
                        email: data.personalInfo.email,
                        phone: data.personalInfo.phone,
                        location: data.personalInfo.location,
                        orcid: data.personalInfo.orcid || null,
                        linkedin: data.personalInfo.linkedin || null,
                        github: data.personalInfo.github || null,
                        website: data.personalInfo.website || null,
                        summary: data.personalInfo.summary || null,
                    }),
                },
            });

            // Update related records using delete + create pattern
            if (data) {
                // Experiences
                await tx.cvExperience.deleteMany({ where: { cvVersionId: id } });
                if (data.experience && data.experience.length > 0) {
                    await tx.cvExperience.createMany({
                        data: data.experience.map((exp, idx: number) => ({
                            cvVersionId: id,
                            company: exp.company || "",
                            position: exp.position || "",
                            startDate: exp.startDate || "",
                            endDate: exp.endDate || null,
                            isCurrent: exp.current || false,
                            description: exp.description || null,
                            achievements: exp.achievements || [],
                            sortOrder: idx,
                        })),
                    });
                }

                // Education
                await tx.cvEducation.deleteMany({ where: { cvVersionId: id } });
                if (data.education && data.education.length > 0) {
                    await tx.cvEducation.createMany({
                        data: data.education.map((edu, idx: number) => ({
                            cvVersionId: id,
                            institution: edu.institution || "",
                            degree: edu.degree || "",
                            field: edu.field || null,
                            startDate: edu.startDate || "",
                            endDate: edu.endDate || null,
                            isCurrent: edu.current || false,
                            sortOrder: idx,
                        })),
                    });
                }

                // Skills
                await tx.cvSkillCategory.deleteMany({ where: { cvVersionId: id } });
                if (data.skills && data.skills.length > 0) {
                    await tx.cvSkillCategory.createMany({
                        data: data.skills.map((skill, idx: number) => ({
                            cvVersionId: id,
                            category: skill.category || "",
                            items: skill.items || [],
                            sortOrder: idx,
                        })),
                    });
                }

                // Projects
                await tx.cvProject.deleteMany({ where: { cvVersionId: id } });
                if (data.projects && data.projects.length > 0) {
                    await tx.cvProject.createMany({
                        data: data.projects.map((proj, idx: number) => ({
                            cvVersionId: id,
                            name: proj.name || "",
                            description: proj.description || null,
                            technologies: proj.technologies || [],
                            url: proj.url || null,
                            year: proj.year || null,
                            sortOrder: idx,
                        })),
                    });
                }

                // Certifications
                await tx.cvCertification.deleteMany({ where: { cvVersionId: id } });
                if (data.certifications && data.certifications.length > 0) {
                    await tx.cvCertification.createMany({
                        data: data.certifications.map((cert, idx: number) => ({
                            cvVersionId: id,
                            name: cert.name || "",
                            issuer: cert.issuer || null,
                            year: cert.date || cert.year || null,  // Accept both 'date' and 'year'
                            url: cert.url || null,
                            sortOrder: idx,
                        })),
                    });
                }

                // Languages
                await tx.cvLanguage.deleteMany({ where: { cvVersionId: id } });
                if (data.languages && data.languages.length > 0) {
                    await tx.cvLanguage.createMany({
                        data: data.languages.map((lang, idx: number) => ({
                            cvVersionId: id,
                            language: lang.name || lang.language || "",  // Accept both 'name' and 'language'
                            level: lang.level || "intermediate",
                            sortOrder: idx,
                        })),
                    });
                }
            }

            return cv;
        });

        devLog("[CV API] Version updated:", updated.id);

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[CV API] Update error:", error);
        return NextResponse.json(
            { error: "Failed to update CV version" },
            { status: 500 }
        );
    }
}

// DELETE - Delete CV version
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const result = await prisma.cvVersion.deleteMany({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: "CV version not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[CV API] Delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete CV version" },
            { status: 500 }
        );
    }
}
