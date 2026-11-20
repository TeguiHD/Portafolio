import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

// El mismo esqueleto que muestra la lista mientras pide las herramientas: no salta al llegar el cliente.
export default function Loading() {
    return <EsqueletoSeccion nombre="las herramientas" cifras={4} filas={6} />;
}
