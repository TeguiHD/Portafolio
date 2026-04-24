import { requirePagePermission } from "@/lib/page-security";
import SecurityDashboardClient from "./client";

export const metadata = {
    title: "Centro de Seguridad | Admin",
    description: "Monitoreo de seguridad en tiempo real",
};

export default async function SecurityPage() {
    await requirePagePermission("security.view");

    return <SecurityDashboardClient />;
}
