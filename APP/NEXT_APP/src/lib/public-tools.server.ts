import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { mergePublicToolCatalog } from "@/lib/tool-registry";

// Compartido por el catálogo y la navegación; una consulta por render.
export const getPublicTools = cache(async () => {
    try {
        return mergePublicToolCatalog(await prisma.tool.findMany({
            where: { isPublic: true, isActive: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, slug: true, name: true, description: true, icon: true, category: true, sortOrder: true },
        }));
    } catch {
        return mergePublicToolCatalog();
    }
});
