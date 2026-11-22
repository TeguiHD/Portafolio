"use client";

import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { ToolAccessBlocked } from "@/components/tools/ToolAccessBlocked";
import { useToolAccess } from "@/hooks/useToolAccess";
import { CalculadoraIva } from "@/components/tools/chile/CalculadoraIva";
import { BotonInsertar } from "@/components/tools/chile/BotonInsertar";

export default function TaxCalculatorPage() {
    const { isLoading, isAuthorized, accessType, toolName } = useToolAccess("impuestos");

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F1724] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-1 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <ToolAccessBlocked accessType={accessType} toolName={toolName || "Calculadora de IVA"} />;
    }

    return (
        <div className="tool-page">
            <main className="tool-main pt-24 pb-12 sm:pt-28 sm:pb-16">
                <ToolPageHeader slug="impuestos" />
                <CalculadoraIva />
                <BotonInsertar slug="impuestos" />
            </main>
        </div>
    );
}
