import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SecurityDashboardClient from "./client";

export const metadata = {
    title: "Centro de Seguridad | Admin",
    description: "Monitoreo de seguridad en tiempo real",
};

export default async function SecurityPage() {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session?.user || (userRole !== "ADMIN" && userRole !== "SUPERADMIN")) {
        redirect("/acceso");
    }

    return <SecurityDashboardClient />;
}
