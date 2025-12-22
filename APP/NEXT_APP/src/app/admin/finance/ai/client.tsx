"use client";

import { AIAnalysis } from "@/modules/finance/components";

export default function AIAnalysisPageClient() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Análisis Inteligente</h1>
                <p className="text-gray-400 mt-1">Obtén insights y consejos personalizados con IA</p>
            </div>

            <AIAnalysis />
        </div>
    );
}

