"use client";

import { PaginaChilena } from "@/components/tools/chile/PaginaChilena";
import { CalculadoraSueldo } from "@/components/tools/chile/CalculadoraSueldo";

export default function Pagina() {
    return <PaginaChilena slug="sueldo-liquido" nombre="Calculadora de sueldo líquido"><CalculadoraSueldo /></PaginaChilena>;
}
