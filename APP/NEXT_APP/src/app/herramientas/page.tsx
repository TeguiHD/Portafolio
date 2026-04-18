import { prisma } from "@/lib/prisma";
import ToolsGrid from "@/components/tools/ToolsGrid";
import { mergePublicToolCatalog } from "@/lib/tool-registry";

export const revalidate = 10; // Revalidate every 10 seconds for faster updates

async function getPublicTools() {
    try {
        const dbTools = await prisma.tool.findMany({
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
                sortOrder: true,
            },
        });

        return mergePublicToolCatalog(dbTools);
    } catch {
        return mergePublicToolCatalog();
    }
}

export default async function ToolsPage() {
    const combinedTools = await getPublicTools();

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F1724] via-[#1E293B] to-[#0F1724]">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
                {/* Hero */}
                <div className="text-center mb-10 sm:mb-14">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-neutral-400 mb-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {combinedTools.length} herramientas disponibles
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                        Herramientas{" "}
                        <span className="bg-gradient-to-r from-[#FF8A00] to-[#00B8A9] bg-clip-text text-transparent">
                            Gratuitas
                        </span>
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                        Utilidades de desarrollo y diseño que uso en mi trabajo diario.
                        Sin registro, sin marcas de agua.
                    </p>
                </div>

                {/* Tools Grid */}
                <ToolsGrid tools={combinedTools} />
            </main>
        </div>
    );
}
