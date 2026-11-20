import { redirect } from "next/navigation";

// «Servicios» repetía Contratos, Clientes y Pagos; lo que tenía de propio (cobrado del mes, contratos por vencer) está en el resumen.
export default function ServiciosPage() {
    redirect("/admin/gestion-comercial");
}
