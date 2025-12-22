import { requirePagePermission } from "@/lib/page-security";
import { FinanceDashboardClean } from "@/modules/finance/components/FinanceDashboardClean";
import { FinanceProvider } from "@/modules/finance/context/FinanceContext";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
    // Server-side permission validation
    const session = await requirePagePermission('finance.view');

    return (
        <FinanceProvider>
            <FinanceDashboardClean userId={session.user.id} />
        </FinanceProvider>
    );
}

