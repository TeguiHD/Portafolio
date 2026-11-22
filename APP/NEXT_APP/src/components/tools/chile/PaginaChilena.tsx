"use client";

import type { ReactNode } from "react";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useToolAccess } from "@/hooks/useToolAccess";
import { BotonInsertar } from "./BotonInsertar";

/** La página de una herramienta chilena: cabecera, la herramienta y «Insertar en tu sitio». */
export function PaginaChilena({ slug, nombre, children }: { slug: string; nombre: string; children: ReactNode }) {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess(slug);
    if (isLoading) return null;
    if (!isAuthorized) return <ToolAccessBlocked accessType={accessType} toolName={toolName || nombre} />;
    return (
        <div className="tool-page">
            <main className="tool-main pt-24 pb-12 sm:pt-28 sm:pb-16">
                <ToolPageHeader slug={slug} />
                {children}
                <BotonInsertar slug={slug} />
            </main>
        </div>
    );
}
