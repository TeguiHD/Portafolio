"use client";

import { useState } from "react";
import type { Medida } from "@/lib/servicios";
import { Anillos } from "./Anillos";

/**
 * Las cifras del caso real: una fila de anillos por página medida y un selector celular/escritorio. Arranca en celular,
 * que es donde las notas suelen ser más bajas (mostrar primero la mejor sería maquillarlas). Al cambiar, los anillos
 * pasan de una nota a otra (la transición la hace la propiedad --valor registrada en servicios.css).
 */
export function Marcador({ medidas }: { medidas: Medida[] }) {
    const [disp, setDisp] = useState<Medida["dispositivo"]>("celular");
    const paginas = [...new Set(medidas.map((m) => m.pagina))];
    return (
        <div className="sv-marcador">
            <div className="sv-dispositivo" role="group" aria-label="Dispositivo de la medición">
                {(["celular", "escritorio"] as const).map((d) => (
                    <button key={d} type="button" aria-pressed={disp === d} onClick={() => setDisp(d)}>{d === "celular" ? "En celular" : "En escritorio"}</button>
                ))}
            </div>
            {paginas.map((p) => {
                const m = medidas.find((x) => x.pagina === p && x.dispositivo === disp);
                if (!m) return null;
                return (
                    <div className="sv-pagina" key={p}>
                        <p className="sv-pagina-nombre">{p}</p>
                        <Anillos notas={m} contexto={`de ${p} en ${disp}`} />
                    </div>
                );
            })}
        </div>
    );
}
