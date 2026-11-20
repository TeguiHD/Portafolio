"use client";

import { useMemo, useState } from "react";

/** Hijos que se pintan por tanda: un arreglo de 100.000 elementos no debe crear 100.000 filas de golpe. */
const LOTE = 100;
const MAX_TEXTO = 300;

const COLOR = { key: "#EC4899", string: "#10B981", number: "#F59E0B", boolean: "#6366F1", null: "#EF4444", index: "#94A3B8" };

function plural(n: number, uno: string, varios: string): string {
    return `${n.toLocaleString("es-CL")} ${n === 1 ? uno : varios}`;
}

function Nombre({ nombre, indice }: { nombre: string; indice: boolean }) {
    return (
        <>
            <span style={{ color: indice ? COLOR.index : COLOR.key }}>{indice ? nombre : JSON.stringify(nombre)}</span>
            <span className="text-neutral-500">: </span>
        </>
    );
}

function Primitivo({ valor }: { valor: unknown }) {
    if (typeof valor === "string") {
        const texto = JSON.stringify(valor);
        const corto = texto.length > MAX_TEXTO;
        return (
            <span style={{ color: COLOR.string }} className="break-all">
                {corto ? `${texto.slice(0, MAX_TEXTO)}…` : texto}
                {corto && <span className="ml-1 text-xs text-neutral-500">({plural(valor.length, "carácter", "caracteres")})</span>}
            </span>
        );
    }
    if (typeof valor === "number") return <span style={{ color: COLOR.number }}>{String(valor)}</span>;
    if (typeof valor === "boolean") return <span style={{ color: COLOR.boolean }}>{String(valor)}</span>;
    return <span style={{ color: COLOR.null }}>null</span>;
}

interface NodoProps {
    nombre: string | null;
    indice?: boolean;
    valor: unknown;
    abiertoInicial?: boolean;
}

function Contenedor({ nombre, indice = false, valor, abiertoInicial = false }: NodoProps & { valor: object }) {
    const [abierto, setAbierto] = useState(abiertoInicial);
    const [visibles, setVisibles] = useState(LOTE);
    const esArreglo = Array.isArray(valor);
    const claves = useMemo(() => (Array.isArray(valor) ? null : Object.keys(valor)), [valor]);
    const total = esArreglo ? (valor as unknown[]).length : claves?.length ?? 0;
    const conteo = esArreglo ? plural(total, "elemento", "elementos") : plural(total, "clave", "claves");

    const hijos: { clave: string; valor: unknown }[] = [];
    if (abierto) {
        const hasta = Math.min(visibles, total);
        for (let k = 0; k < hasta; k++) {
            if (esArreglo) hijos.push({ clave: String(k), valor: (valor as unknown[])[k] });
            else {
                const clave = (claves as string[])[k];
                hijos.push({ clave, valor: (valor as Record<string, unknown>)[clave] });
            }
        }
    }

    return (
        <li>
            {/* Los hijos solo existen mientras el nodo está abierto: un documento grande no se pinta entero. */}
            <details open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
                <summary className="cursor-pointer rounded py-2.5 sm:py-0.5 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300">
                    {nombre !== null && <Nombre nombre={nombre} indice={indice} />}
                    <span className="text-neutral-400">{esArreglo ? "[ ]" : "{ }"}</span>
                    <span className="ml-2 text-xs text-neutral-500">{conteo}</span>
                </summary>
                {abierto && total > 0 && (
                    <ul className="ml-1.5 border-l border-white/10 pl-4">
                        {hijos.map((h) => <Nodo key={h.clave} nombre={h.clave} indice={esArreglo} valor={h.valor} />)}
                        {total > visibles && (
                            <li className="py-1">
                                <button type="button" onClick={() => setVisibles((v) => v + LOTE)} className="studio-button">
                                    Mostrar {Math.min(LOTE, total - visibles).toLocaleString("es-CL")} más (quedan {(total - visibles).toLocaleString("es-CL")})
                                </button>
                            </li>
                        )}
                    </ul>
                )}
            </details>
        </li>
    );
}

function Nodo({ nombre, indice = false, valor, abiertoInicial }: NodoProps) {
    if (valor !== null && typeof valor === "object") return <Contenedor nombre={nombre} indice={indice} valor={valor} abiertoInicial={abiertoInicial} />;
    return (
        <li className="py-2.5 sm:py-0.5">
            {nombre !== null && <Nombre nombre={nombre} indice={indice} />}
            <Primitivo valor={valor} />
        </li>
    );
}

/** Vista de árbol plegable con details/summary: teclado y lector de pantalla funcionan sin ARIA extra. */
export function ArbolJson({ data }: { data: unknown }) {
    return (
        <ul aria-label="Árbol del JSON" className="font-mono text-sm leading-5">
            <Nodo nombre={null} valor={data} abiertoInicial />
        </ul>
    );
}
