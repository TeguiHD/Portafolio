"use client";

import { PaginaChilena } from "@/components/tools/chile/PaginaChilena";
import { ConversorIndicadores } from "@/components/tools/chile/ConversorIndicadores";

export default function Pagina() {
    return <PaginaChilena slug="uf-utm" nombre="Conversor UF, UTM y dólar"><ConversorIndicadores /></PaginaChilena>;
}
