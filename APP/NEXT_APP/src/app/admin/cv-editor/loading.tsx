import { EsqueletoSeccion } from "@/modules/admin/armazon/EsqueletoSeccion";

// Mismo esqueleto que muestra el editor mientras trae las versiones: la carga no salta de un dibujo a otro.
export default function Loading() {
    return <EsqueletoSeccion nombre="el currículum" barra filas={5} />;
}
