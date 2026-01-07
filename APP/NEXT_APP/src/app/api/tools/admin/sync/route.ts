import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List of all tools that should exist in the database
const ALL_TOOLS = [
    {
        slug: "qr",
        name: "Generador de QR",
        description: "Crea códigos QR personalizados para cualquier URL o texto. Sin marcas de agua, descarga gratuita.",
        icon: "qr",
        category: "utility",
        isPublic: true,
        isActive: true,
        sortOrder: 1
    },
    {
        slug: "claves",
        name: "Generador de Contraseñas",
        description: "Crea contraseñas seguras y aleatorias con longitud y caracteres personalizables.",
        icon: "lock",
        category: "security",
        isPublic: true,
        isActive: true,
        sortOrder: 2
    },
    {
        slug: "unidades",
        name: "Conversor de Unidades",
        description: "Convierte entre diferentes unidades de medida: longitud, peso, temperatura, datos y más.",
        icon: "scale",
        category: "utility",
        isPublic: true,
        isActive: true,
        sortOrder: 3
    },
    {
        slug: "regex",
        name: "Regex Tester",
        description: "Prueba y depura tus expresiones regulares en tiempo real con resaltado de coincidencias.",
        icon: "code",
        category: "dev",
        isPublic: true,
        isActive: true,
        sortOrder: 4
    },
    {
        slug: "base64",
        name: "Conversor Base64",
        description: "Convierte imágenes a Base64 y codifica/decodifica texto para uso en desarrollo web.",
        icon: "image",
        category: "dev",
        isPublic: true,
        isActive: true,
        sortOrder: 5
    },
];

// POST: Sync tools - inserts any missing tools from the hardcoded list
export async function POST() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const results = {
            created: [] as string[],
            existing: [] as string[],
            errors: [] as string[],
        };

        for (const tool of ALL_TOOLS) {
            try {
                const existing = await prisma.tool.findUnique({
                    where: { slug: tool.slug },
                });

                if (existing) {
                    results.existing.push(tool.slug);
                } else {
                    await prisma.tool.create({ data: tool });
                    results.created.push(tool.slug);
                }
            } catch (error) {
                console.error(`Error syncing tool ${tool.slug}:`, error);
                results.errors.push(tool.slug);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${results.created.length} tools`,
            ...results,
        });
    } catch (error) {
        console.error("Error syncing tools:", error);
        return NextResponse.json({ error: "Error syncing tools" }, { status: 500 });
    }
}
