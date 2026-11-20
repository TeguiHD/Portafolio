import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

// Esqueleto de servidor (el viejo, DashboardPageSkeleton, metía framer-motion en todas las páginas del panel).
export default function Loading() {
    return <EsqueletoSeccion nombre="el panel" cifras={4} filas={5} />;
}
