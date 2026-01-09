import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ContactPageClient from "./client";

export const metadata: Metadata = {
    title: "Mensajes de Contacto | Admin",
    description: "Gestión de mensajes de contacto",
};

export default async function ContactAdminPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/acceso");
    }

    // Only SUPERADMIN can access
    if (session.user.role !== "SUPERADMIN") {
        redirect("/admin");
    }

    return <ContactPageClient />;
}
