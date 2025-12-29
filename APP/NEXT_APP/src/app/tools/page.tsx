import { prisma } from "@/lib/prisma";
import ToolsGrid from "@/components/tools/ToolsGrid";

export const revalidate = 10; // Revalidate every 10 seconds for faster updates

async function getPublicTools() {
    try {
        const tools = await prisma.tool.findMany({
            where: {
                isPublic: true,
                isActive: true,
            },
            orderBy: {
                sortOrder: "asc",
            },
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                icon: true,
                category: true,
            },
        });
        return { tools, fromDb: true };
    } catch {
        // If tables don't exist yet (before migration), return empty
        return { tools: [], fromDb: false };
    }
}

export default async function ToolsPage() {
    const { tools: dbTools, fromDb } = await getPublicTools();

    // Hardcoded tools with categories
    // Categories: "generación" (create new content), "conversión" (transform data), "productividad" (workflow helpers)
    const hardcodedTools = [
        {
            id: "qr-generator",
            slug: "qr-generator",
            name: "Generador de QR",
            description: "Crea códigos QR personalizados para cualquier URL o texto. Sin marcas de agua, descarga gratuita.",
            icon: "qr",
            category: "generación",
        },
        {
            id: "password-generator",
            slug: "password-generator",
            name: "Generador de Contraseñas",
            description: "Crea contraseñas seguras y aleatorias con longitud y caracteres personalizables.",
            icon: "lock",
            category: "generación",
        },
        {
            id: "unit-converter",
            slug: "unit-converter",
            name: "Conversor de Unidades",
            description: "Convierte entre diferentes unidades de medida: longitud, peso, temperatura, datos y más.",
            icon: "scale",
            category: "conversión",
        },
        {
            id: "regex-tester",
            slug: "regex-tester",
            name: "Regex Tester",
            description: "Prueba y depura tus expresiones regulares en tiempo real con resaltado de coincidencias.",
            icon: "code",
            category: "productividad",
        },
        {
            id: "image-base64",
            slug: "image-base64",
            name: "Conversor Base64",
            description: "Convierte imágenes a Base64 y codifica/decodifica texto para uso en desarrollo web.",
            icon: "image",
            category: "conversión",
        },
        {
            id: "link-generator",
            slug: "link-generator",
            name: "Generador de Links",
            description: "Crea links para WhatsApp, correo y eventos de calendario fácilmente.",
            icon: "link",
            category: "generación",
        },
        {
            id: "random-picker",
            slug: "random-picker",
            name: "Sorteos y Ruleta",
            description: "Elige ganadores al azar con una ruleta animada o genera grupos aleatorios.",
            icon: "dice",
            category: "productividad",
        },
        {
            id: "tax-calculator",
            slug: "tax-calculator",
            name: "Calculadora de IVA",
            description: "Calcula el IVA: agrega o quita impuestos del monto, con tasas personalizables.",
            icon: "calculator",
            category: "conversión",
        },
        {
            id: "binary-translator",
            slug: "binary-translator",
            name: "Traductor Binario",
            description: "Convierte texto a código binario y viceversa. Perfecto para curiosos y aprendizaje.",
            icon: "binary",
            category: "conversión",
        },
    ];

    // Merge DB tools with hardcoded
    const combinedTools = [...hardcodedTools];

    if (fromDb && dbTools.length > 0) {
        dbTools.forEach(dbTool => {
            if (!combinedTools.find(t => t.slug === dbTool.slug)) {
                combinedTools.push({
                    ...dbTool,
                    description: dbTool.description ?? "",
                    icon: dbTool.icon ?? "default",
                    category: dbTool.category ?? "generación",
                });
            }
        });
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Hero */}
                <div className="text-center mb-12 sm:mb-16">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Herramientas{" "}
                        <span className="bg-gradient-to-r from-[#FF8A00] to-[#00B8A9] bg-clip-text text-transparent">
                            Gratuitas
                        </span>
                    </h1>
                    <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
                        Utilidades de desarrollo y diseño que uso en mi trabajo diario.
                        Sin registro, sin marcas de agua, 100% gratis.
                    </p>
                </div>

                {/* Tools Grid with Search and Filters */}
                <ToolsGrid tools={combinedTools} />
            </main>
        </div>
    );
}
