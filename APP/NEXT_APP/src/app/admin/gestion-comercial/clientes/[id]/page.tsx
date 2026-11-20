import { redirect } from "next/navigation";

// La ficha del cliente vive ahora en /admin/clientes/[id].
export default async function FichaClienteComercialPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/admin/clientes/${encodeURIComponent(id)}`);
}
