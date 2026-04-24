import { Metadata } from "next";
import { requirePagePermission } from "@/lib/page-security";
import ContactPageClient from "./client";

export const metadata: Metadata = {
    title: "Mensajes de Contacto | Admin",
    description: "Gestión de mensajes de contacto",
};

export default async function ContactAdminPage() {
    await requirePagePermission("contact.manage");

    return <ContactPageClient />;
}
