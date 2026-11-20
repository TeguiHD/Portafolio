import { requirePagePermission } from "@/lib/page-security";
import { FinanceDashboardClean } from "@/modules/finance/components/FinanceDashboardClean";

export const dynamic = "force-dynamic";

// El FinanceProvider ya lo pone finance/layout.tsx para todas las páginas de Finanzas.
export default async function FinancePage() {
    const session = await requirePagePermission("finance.view");

    return <FinanceDashboardClean userId={session.user.id} />;
}
