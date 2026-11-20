import { redirect } from "next/navigation";

// Había dos directorios de clientes; el único ahora es /admin/clientes (con la ficha en /admin/clientes/[id]).
export default function ClientesComercialPage() {
    redirect("/admin/clientes");
}
