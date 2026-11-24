"use client";

import { useMemo, useState } from "react";
import { fechaCL, mesCL, pesos } from "@/lib/chile/indicadores";
import { useIndicadores } from "./IndicadoresContext";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { IconoCopiar, useCopiarHerramienta } from "./comunes";
import "./chile.css";

type Unidad = "UF" | "UTM" | "USD" | "EUR" | "CLP";
const SLUG = "uf-utm";
const NOMBRES: Record<Unidad, string> = { UF: "UF", UTM: "UTM", USD: "Dólares", EUR: "Euros", CLP: "Pesos chilenos" };

/**
 * UF, UTM, dólar y euro del día (los trae el servidor) y un conversor en los dos sentidos. Si la fuente no respondió,
 * se pueden escribir los valores a mano: nada se inventa.
 */
export function ConversorIndicadores() {
    const ind = useIndicadores();
    const [monto, setMonto] = useState<number | null>(1);
    const [desde, setDesde] = useState<Unidad>("UF");
    const [manual, setManual] = useState<Record<"UF" | "UTM" | "USD", number | null>>({ UF: null, UTM: null, USD: null });
    const { copiado, fallo, copiar } = useCopiarHerramienta(SLUG);

    const valores = useMemo<Partial<Record<Unidad, number>>>(() => ({
        CLP: 1,
        UF: ind?.uf.valor ?? manual.UF ?? undefined,
        UTM: ind?.utm.valor ?? manual.UTM ?? undefined,
        USD: ind?.dolar.valor ?? manual.USD ?? undefined,
        EUR: ind?.euro?.valor,
    }), [ind, manual]);

    const n = monto;
    const enPesos = n !== null && valores[desde] ? n * valores[desde]! : null;
    const destinos = (["CLP", "UF", "UTM", "USD", "EUR"] as Unidad[]).filter((u) => u !== desde && valores[u]);
    const formatear = (u: Unidad, v: number) => (u === "CLP" ? pesos(Math.round(v)) : `${v.toLocaleString("es-CL", { maximumFractionDigits: u === "UF" || u === "UTM" ? 4 : 2 })} ${u === "USD" ? "US$" : u === "EUR" ? "€" : u}`);

    return (
        <div className="cl">
            {ind ? (
                <dl className="cl-indicadores" aria-label="Valores de hoy">
                    <div><dt>UF del {fechaCL(ind.uf.fecha)}</dt><dd>{pesos(ind.uf.valor, 2)}</dd></div>
                    <div><dt>UTM de {mesCL(ind.utm.fecha)}</dt><dd>{pesos(ind.utm.valor)}</dd></div>
                    <div><dt>Dólar observado <small>{fechaCL(ind.dolar.fecha)}</small></dt><dd>{pesos(ind.dolar.valor, 2)}</dd></div>
                    {ind.euro ? <div><dt>Euro <small>{fechaCL(ind.euro.fecha)}</small></dt><dd>{pesos(ind.euro.valor, 2)}</dd></div> : null}
                </dl>
            ) : (
                <div className="cl-panel">
                    <p className="cl-nota" role="status">La fuente de los valores del día no respondió. Escríbelos a mano (los publica el SII y el Banco Central) y el conversor funciona igual.</p>
                    {(["UF", "UTM", "USD"] as const).map((u) => (
                        <div key={u}>
                            <label className="cl-etiqueta" htmlFor={`ind-${u}`}>Valor de {u === "USD" ? "1 dólar" : `1 ${u}`} en pesos</label>
                            <CampoNumero id={`ind-${u}`} className="cl-entrada cl-chica" decimales={2} valor={manual[u]} alCambiar={(v) => setManual((m) => ({ ...m, [u]: v }))} />
                        </div>
                    ))}
                </div>
            )}

            <div className="cl-panel">
                <div className="cl-dos cl">
                    <div>
                        <label className="cl-etiqueta" htmlFor="ind-monto">Monto</label>
                        <CampoNumero id="ind-monto" className="cl-entrada" decimales={4} valor={monto} alCambiar={setMonto} onFocus={(e) => e.currentTarget.select()} />
                    </div>
                    <div>
                        <label className="cl-etiqueta" htmlFor="ind-desde">En</label>
                        <select id="ind-desde" className="cl-entrada" value={desde} onChange={(e) => setDesde(e.target.value as Unidad)}>
                            {(["UF", "UTM", "USD", "EUR", "CLP"] as Unidad[]).filter((u) => u === "CLP" || valores[u] || u === desde).map((u) => <option key={u} value={u}>{NOMBRES[u]}</option>)}
                        </select>
                    </div>
                </div>
                {enPesos === null ? (
                    <p className="cl-estado cl-mal" role="status">{monto !== null ? "No es un monto. Escribe, por ejemplo, 1.250.000 o 3,5." : ""}</p>
                ) : (
                    <dl className="cl-filas" aria-live="polite">
                        {destinos.map((u, i) => {
                            const v = enPesos / valores[u]!, texto = formatear(u, v);
                            return (
                                <div key={u} className={`cl-fila${i === 0 ? " cl-total" : ""}`}>
                                    <dt>{NOMBRES[u]}</dt>
                                    <dd>{texto}<button type="button" className="cl-copiar" aria-label={`Copiar el monto en ${NOMBRES[u].toLowerCase()}`} onClick={() => void copiar(u === "CLP" ? String(Math.round(v)) : v.toLocaleString("es-CL", { maximumFractionDigits: 4 }), u)}><IconoCopiar hecho={copiado === u} /></button></dd>
                                </div>
                            );
                        })}
                    </dl>
                )}
                <p className="cl-nota" role="status">{fallo ? "No se pudo copiar: selecciona la cifra y cópiala a mano." : ""}</p>
            </div>
            {ind ? <p className="cl-nota">Fuente: {ind.fuente}. La UF cambia cada día; la UTM, cada mes; el dólar observado, cada día hábil.</p> : null}
        </div>
    );
}
