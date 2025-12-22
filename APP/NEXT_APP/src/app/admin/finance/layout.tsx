import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permission-check";
import { FinanceProvider } from "@/modules/finance";
import type { Role } from "@prisma/client";

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
    const session = await auth();
    
    if (!session?.user) {
        redirect("/login");
    }

    // Check finance permission
    const canViewFinance = await hasPermission(session.user.id, session.user.role as Role, "finance.view");
    
    if (!canViewFinance) {
        redirect("/forbidden");
    }

    return (
        <FinanceProvider>
            {children}
        </FinanceProvider>
    );
}
