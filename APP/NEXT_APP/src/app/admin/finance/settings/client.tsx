"use client";

import { ImportExport, CurrencyConverter } from "@/modules/finance/components";

export default function SettingsPageClient() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Configuración</h1>
                <p className="text-gray-400 mt-1">Gestiona tus datos y preferencias</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Import/Export */}
                <div className="lg:col-span-2">
                    <ImportExport />
                </div>

                {/* Currency Converter */}
                <div>
                    <CurrencyConverter />
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Acerca de tus datos</h3>
                    <div className="space-y-3">
                        <InfoRow label="Versión de datos" value="1.0" />
                        <InfoRow label="Última sincronización" value="Ahora" />
                        <InfoRow label="Zona horaria" value="America/Santiago" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0">
            <span className="text-gray-400">{label}</span>
            <span className="text-white font-medium">{value}</span>
        </div>
    );
}

