"use client";

import { useRouter } from "next/navigation";
import { RecurringForm } from "@/modules/finance/components";
import { FinanceBreadcrumbs } from "@/modules/finance/components/FinanceBreadcrumbs";
import { CabeceraFinanzas } from "@/modules/finance/components/Piezas";
import { TARJETA } from "@/modules/finance/components/estilos";

export default function NewRecurringPage() {
    const router = useRouter();

    const handleSuccess = () => {
        router.push("/admin/finance/recurring");
    };

    return (
        <div className="max-w-2xl pb-8">
            <FinanceBreadcrumbs />

            <CabeceraFinanzas
                titulo="Nuevo pago recurrente"
                bajada="Configura un gasto o ingreso que se repite periódicamente"
            />

            <div className={`${TARJETA} mt-6 p-5 sm:p-6`}>
                <RecurringForm onSuccess={handleSuccess} onCancel={() => router.push("/admin/finance/recurring")} />
            </div>
        </div>
    );
}
