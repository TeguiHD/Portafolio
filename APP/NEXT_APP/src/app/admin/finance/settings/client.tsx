"use client";

import { ImportExport, CurrencyConverter } from "@/modules/finance/components";
import { CabeceraFinanzas } from "@/modules/finance/components/Piezas";

export default function SettingsPageClient() {
    return (
        <div className="max-w-[1180px] pb-8">
            <CabeceraFinanzas titulo="Configuración" bajada="Gestiona tus datos y preferencias" />

            <div className="mt-8 grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
                <ImportExport />
                <CurrencyConverter />
            </div>
        </div>
    );
}
