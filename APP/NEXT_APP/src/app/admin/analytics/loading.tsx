import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

// Las cifras se cuentan en el servidor antes de mostrar la página: mientras tanto, un esqueleto sin JavaScript.
export default function Loading() {
    return <EsqueletoSeccion nombre="las visitas" cifras={4} filas={6} />;
}
