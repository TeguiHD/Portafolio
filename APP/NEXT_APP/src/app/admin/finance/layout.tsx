import { Metadata } from "next";
import { requirePagePermission } from "@/lib/page-security";
import { FinanceProvider } from "@/modules/finance/context/FinanceContext";
import { NavFinanzas } from "@/modules/finance/components/NavFinanzas";

export const metadata: Metadata = {
    title: "Finanzas | Panel",
    description: "Gestión de finanzas personales",
};

export const dynamic = "force-dynamic";

export default async function FinanceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requirePagePermission("finance.view");

    return (
        <FinanceProvider>
            <NavFinanzas />
            {children}
        </FinanceProvider>
    );
}
