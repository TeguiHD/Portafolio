"use client";

import { PaginaChilena } from "@/components/tools/chile/PaginaChilena";
import { CalculadoraHonorarios } from "@/components/tools/chile/CalculadoraHonorarios";

export default function Pagina() {
    return <PaginaChilena slug="boleta-honorarios" nombre="Calculadora de boleta de honorarios"><CalculadoraHonorarios /></PaginaChilena>;
}
