import { redirect } from "next/navigation";

// Era un marcador con un enlace: las propuestas viven en /admin/cotizaciones.
export default function PropuestasPage() {
    redirect("/admin/cotizaciones");
}
