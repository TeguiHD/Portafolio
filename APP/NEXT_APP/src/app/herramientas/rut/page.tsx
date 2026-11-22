"use client";

import { PaginaChilena } from "@/components/tools/chile/PaginaChilena";
import { ValidadorRut } from "@/components/tools/chile/ValidadorRut";

export default function Pagina() {
    return <PaginaChilena slug="rut" nombre="Validador de RUT"><ValidadorRut /></PaginaChilena>;
}
