"use client";

import { useId } from "react";
import { TOOL_ICONS } from "@/components/tools/ToolIcons";
import { COLOR_CATEGORIA } from "@/modules/landing/viva/siglas";
import { DIBUJOS, FLECHA_ACCESO, type IconoSistema } from "./dibujos";

export type { IconoSistema } from "./dibujos";
/** Lo que pinta un ícono: uno de los dibujos propios o la placa de una herramienta. */
export type IconoApp = IconoSistema | { herramienta: string; familia: string };

/** Los ids de React (`«r1»`) no sirven dentro de url(#…) de un SVG: se dejan solo letras, números y guiones. */
const prefijo = (id: string) => `i${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

function mezclar(hex: string, con: string, t: number): string {
    const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(con.slice(i, i + 2), 16));
    return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Ícono de objeto (carpeta, correo, fotos…). Los dibujos son texto fijo de dibujos.ts, nunca datos de fuera. */
export function Icono({ id, tam, acceso = false }: { id: IconoSistema; tam: number; acceso?: boolean }) {
    const u = prefijo(useId());
    return <svg className="es-icono" width={tam} height={tam} viewBox="0 0 48 48" aria-hidden="true" focusable="false"
        dangerouslySetInnerHTML={{ __html: DIBUJOS[id](u) + (acceso ? FLECHA_ACCESO : "") }} />;
}

/** Una herramienta: su ícono del catálogo en blanco sobre una placa con el color de su familia. */
export function IconoHerramienta({ slug, familia, tam, acceso = false }: { slug: string; familia: string; tam: number; acceso?: boolean }) {
    const u = prefijo(useId());
    const color = COLOR_CATEGORIA[familia] ?? "#5eead4";
    const Glifo = TOOL_ICONS[slug];
    return (
        <svg className="es-icono" width={tam} height={tam} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={mezclar(color, "#ffffff", 0.05)} />
                    <stop offset="1" stopColor={mezclar(color, "#000000", 0.45)} />
                </linearGradient>
            </defs>
            <rect x="4" y="4" width="40" height="40" rx="10" fill={`url(#${u}g)`} />
            <rect x="4.5" y="4.5" width="39" height="39" rx="9.5" fill="none" stroke="#ffffff" strokeOpacity=".24" />
            {Glifo ? <Glifo x={12} y={12} width={24} height={24} strokeWidth={1.9} style={{ color: "#ffffff" }} /> : null}
            {acceso ? <g dangerouslySetInnerHTML={{ __html: FLECHA_ACCESO }} /> : null}
        </svg>
    );
}

export function IconoDe({ icono, tam, acceso = false }: { icono: IconoApp; tam: number; acceso?: boolean }) {
    return typeof icono === "string"
        ? <Icono id={icono} tam={tam} acceso={acceso} />
        : <IconoHerramienta slug={icono.herramienta} familia={icono.familia} tam={tam} acceso={acceso} />;
}
