"use client";

import { useMemo, useState } from "react";
import { brutoDesdeLiquido, liquidoDesdeBruto } from "@/lib/chile/honorarios";
import { RETENCION_HONORARIOS, FUENTE_RETENCION } from "@/lib/chile/parametros";
import { pesos } from "@/lib/chile/indicadores";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { IconoCopiar, useCopiarHerramienta } from "./comunes";
import "./chile.css";

type Sentido = "bruto" | "liquido";
const SLUG = "boleta-honorarios";
const ANIOS = Object.keys(RETENCION_HONORARIOS).map(Number).sort((a, b) => a - b);

const tasaTexto = (t: number) => `${(t * 100).toLocaleString("es-CL", { maximumFractionDigits: 2 })} %`;

/** Boleta de honorarios: del bruto al líquido o del líquido que quieres recibir al bruto que debes cobrar. */
export function CalculadoraHonorarios() {
    const anioActual = new Date().getFullYear();
    const [anio, setAnio] = useState(ANIOS.includes(anioActual) ? anioActual : ANIOS[ANIOS.length - 1]!);
    const [sentido, setSentido] = useState<Sentido>("bruto");
    const [monto, setMonto] = useState<number | null>(500000);
    const { copiado, fallo, copiar } = useCopiarHerramienta(SLUG);
    const tasa = RETENCION_HONORARIOS[anio]!;
    const n = monto;
    const r = useMemo(() => (n === null || n <= 0 ? null : sentido === "bruto" ? liquidoDesdeBruto(n, tasa) : brutoDesdeLiquido(n, tasa)), [n, sentido, tasa]);

    const fila = (clave: string, rotulo: string, valor: number, extra = "") => (
        <div className={`cl-fila${extra}`}>
            <dt>{rotulo}</dt>
            <dd>{pesos(valor)}<button type="button" className="cl-copiar" aria-label={`Copiar ${rotulo.toLowerCase()}`} onClick={() => void copiar(String(valor), clave)}><IconoCopiar hecho={copiado === clave} /></button></dd>
        </div>
    );

    return (
        <div className="cl cl-dos">
            <div className="cl-panel">
                <div className="cl-segmento" role="group" aria-label="Qué monto tienes">
                    <button type="button" aria-pressed={sentido === "bruto"} onClick={() => setSentido("bruto")}>Tengo el bruto</button>
                    <button type="button" aria-pressed={sentido === "liquido"} onClick={() => setSentido("liquido")}>Quiero recibir</button>
                </div>
                <div>
                    <label className="cl-etiqueta" htmlFor="hon-monto">{sentido === "bruto" ? "Monto bruto de la boleta" : "Monto líquido que quieres recibir"}</label>
                    <div className="cl-prefijo"><span aria-hidden="true">$</span>
                        <CampoNumero id="hon-monto" className="cl-entrada" valor={monto} alCambiar={setMonto} onFocus={(e) => e.currentTarget.select()} />
                    </div>
                </div>
                <div>
                    <label className="cl-etiqueta" htmlFor="hon-anio">Año de la boleta</label>
                    <select id="hon-anio" className="cl-entrada" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
                        {ANIOS.map((a) => <option key={a} value={a}>{a} · retención {tasaTexto(RETENCION_HONORARIOS[a]!)}</option>)}
                    </select>
                </div>
            </div>
            <div className="cl-panel" aria-live="polite">
                {r ? (
                    <dl className="cl-filas">
                        {fila("bruto", "Bruto de la boleta", r.bruto, sentido === "liquido" ? " cl-total" : "")}
                        {fila("retencion", `Retención (${tasaTexto(tasa)})`, r.retencion, " cl-resta")}
                        {fila("liquido", "Líquido que recibes", r.liquido, sentido === "bruto" ? " cl-total" : "")}
                    </dl>
                ) : <p className="cl-estado cl-mal" role="status">{monto !== null ? "Escribe un monto en pesos, por ejemplo 500.000." : ""}</p>}
                <p className="cl-nota">Si la boleta va a una empresa, ella retiene ese monto y lo paga al SII; si va a una persona, la pagas tú. En la Operación Renta de abril la retención se usa para tus cotizaciones de salud y pensión y para tu impuesto. Fuente: {FUENTE_RETENCION}.</p>
                <p className="cl-nota" role="status">{fallo ? "No se pudo copiar: selecciona la cifra y cópiala a mano." : ""}</p>
            </div>
        </div>
    );
}
