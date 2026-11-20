import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sesionPortal } from "@/lib/portal-cliente";
import IngresoPortal from "./ingreso-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Portal de clientes",
    robots: { index: false, follow: false },
};

export default async function PortalClientesPage({
    searchParams,
}: {
    searchParams: Promise<{ usuario?: string | string[] }>;
}) {
    const sesion = await sesionPortal();
    if (sesion) redirect(`/cotizacion/${sesion.slug}`);

    const { usuario } = await searchParams;
    return <IngresoPortal usuarioInicial={typeof usuario === "string" ? usuario.slice(0, 60) : ""} />;
}
