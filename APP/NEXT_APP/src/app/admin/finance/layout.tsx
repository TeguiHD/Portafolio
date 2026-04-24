import { Metadata } from "next";
import { requirePagePermission } from "@/lib/page-security";
import { FinanceProvider } from "@/modules/finance";

export const metadata: Metadata = {
    title: "Finanzas | Admin Panel",
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
            {children}
        </FinanceProvider>
    );
}
