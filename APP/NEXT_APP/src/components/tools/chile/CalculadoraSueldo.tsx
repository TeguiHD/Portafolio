"use client";

import { useMemo, useState } from "react";
import { brutoParaLiquido, calcularSueldo, type DatosSueldo } from "@/lib/chile/sueldo";
import { AFPS, PARAMETROS_SUELDO, FUENTES_SUELDO, REFERENCIA_INDICADORES } from "@/lib/chile/parametros";
import { fechaCL, mesCL, pesos } from "@/lib/chile/indicadores";
import { useIndicadores } from "./IndicadoresContext";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { textoDeNumero } from "@/lib/tools/numeros";
import { IconoCopiar, useCopiarHerramienta } from "./comunes";
import "./chile.css";

type Sentido = "bruto" | "liquido";
const SLUG = "sueldo-liquido";
const porcentaje = (t: number) => `${(t * 100).toLocaleString("es-CL", { maximumFractionDigits: 2 })} %`;

/**
 * Sueldo líquido de un mes normal (sin gratificación ni horas extra), con la UF y la UTM del día que trae el servidor
 * y los parámetros vigentes con su fuente (src/lib/chile/parametros.ts). Se puede ir del bruto al líquido o al revés.
 */
export function CalculadoraSueldo() {
    const ind = useIndicadores();
    const uf = ind?.uf ?? REFERENCIA_INDICADORES.uf, utm = ind?.utm ?? REFERENCIA_INDICADORES.utm;
    const ufTopes = ind?.ufFinDeMes ?? uf;
    const p = useMemo(() => ({ ...PARAMETROS_SUELDO, uf: uf.valor, ufTopes: ufTopes.valor, utm: utm.valor }), [uf.valor, ufTopes.valor, utm.valor]);

    const [sentido, setSentido] = useState<Sentido>("bruto");
    const [monto, setMonto] = useState<number | null>(1200000);
    const [afp, setAfp] = useState(AFPS[0]!.nombre);
    const [salud, setSalud] = useState<"fonasa" | "isapre">("fonasa");
    const [plan, setPlan] = useState<number | null>(3.5);
    const [contrato, setContrato] = useState<DatosSueldo["contrato"]>("indefinido");
    const [noImp, setNoImp] = useState<number | null>(null);
    const { copiado, fallo, copiar } = useCopiarHerramienta(SLUG);

    const comision = AFPS.find((a) => a.nombre === afp)!.comision;
    const n = monto, planUf = plan, extra = noImp ?? 0;
    const r = useMemo(() => {
        if (n === null || n <= 0 || (salud === "isapre" && (planUf === null || planUf <= 0))) return null;
        const datos: Omit<DatosSueldo, "bruto"> = { comisionAfp: comision, salud: salud === "isapre" ? { tipo: "isapre", planUf: planUf! } : { tipo: "fonasa" }, contrato, noImponible: extra };
        const bruto = sentido === "bruto" ? n : brutoParaLiquido(n, datos, p);
        return calcularSueldo({ ...datos, bruto }, p);
    }, [n, sentido, comision, salud, planUf, contrato, extra, p]);

    const fila = (clave: string, rotulo: string, valor: number, clase = "", detalle?: string) => (
        <div className={`cl-fila ${clase}`}>
            <dt>{rotulo}{detalle ? <small>{detalle}</small> : null}</dt>
            <dd>{clase.includes("cl-resta") && valor > 0 ? "−" : ""}{pesos(valor)}
                <button type="button" className="cl-copiar" aria-label={`Copiar ${rotulo.toLowerCase()}`} onClick={() => void copiar(String(valor), clave)}><IconoCopiar hecho={copiado === clave} /></button></dd>
        </div>
    );

    return (
        <div className="cl cl-dos">
            <div className="cl-panel">
                <div className="cl-segmento" role="group" aria-label="Qué monto tienes">
                    <button type="button" aria-pressed={sentido === "bruto"} onClick={() => setSentido("bruto")}>Tengo el bruto</button>
                    <button type="button" aria-pressed={sentido === "liquido"} onClick={() => setSentido("liquido")}>Quiero un líquido de</button>
                </div>
                <div>
                    <label className="cl-etiqueta" htmlFor="sl-monto">{sentido === "bruto" ? "Sueldo bruto mensual" : "Sueldo líquido que quieres"} <small>imponible, sin colación ni movilización</small></label>
                    <div className="cl-prefijo"><span aria-hidden="true">$</span>
                        <CampoNumero id="sl-monto" className="cl-entrada" valor={monto} alCambiar={setMonto} onFocus={(e) => e.currentTarget.select()} />
                    </div>
                </div>
                <div>
                    <label className="cl-etiqueta" htmlFor="sl-afp">AFP</label>
                    <select id="sl-afp" className="cl-entrada" value={afp} onChange={(e) => setAfp(e.target.value)}>
                        {AFPS.map((a) => <option key={a.nombre} value={a.nombre}>{a.nombre} · comisión {porcentaje(a.comision)}</option>)}
                    </select>
                </div>
                <div>
                    <p className="cl-etiqueta" id="sl-salud">Salud</p>
                    <div className="cl-segmento" role="group" aria-labelledby="sl-salud">
                        <button type="button" aria-pressed={salud === "fonasa"} onClick={() => setSalud("fonasa")}>Fonasa (7 %)</button>
                        <button type="button" aria-pressed={salud === "isapre"} onClick={() => setSalud("isapre")}>Isapre</button>
                    </div>
                </div>
                {salud === "isapre" ? (
                    <div>
                        <label className="cl-etiqueta" htmlFor="sl-plan">Precio de tu plan <small>en UF al mes, sale en tu contrato</small></label>
                        <CampoNumero id="sl-plan" className="cl-entrada cl-chica" decimales={2} valor={plan} alCambiar={setPlan} />
                    </div>
                ) : null}
                <div>
                    <p className="cl-etiqueta" id="sl-contrato">Contrato</p>
                    <div className="cl-segmento" role="group" aria-labelledby="sl-contrato">
                        <button type="button" aria-pressed={contrato === "indefinido"} onClick={() => setContrato("indefinido")}>Indefinido</button>
                        <button type="button" aria-pressed={contrato === "plazo"} onClick={() => setContrato("plazo")}>Plazo fijo u obra</button>
                    </div>
                </div>
                <div>
                    <label className="cl-etiqueta" htmlFor="sl-noimp">Colación y movilización <small>opcional, no imponible</small></label>
                    <div className="cl-prefijo"><span aria-hidden="true">$</span>
                        <CampoNumero id="sl-noimp" className="cl-entrada cl-chica" valor={noImp} alCambiar={setNoImp} placeholder="0" />
                    </div>
                </div>
            </div>

            <div className="cl-panel" aria-live="polite">
                {r ? (
                    <dl className="cl-filas">
                        {fila("bruto", "Sueldo bruto", r.bruto, sentido === "liquido" ? "cl-total" : "")}
                        {fila("afp", `AFP ${afp}`, r.afp, "cl-resta", `${porcentaje(p.cotizacionAfp)} + comisión ${porcentaje(comision)}${r.imponible < r.bruto ? " sobre el tope imponible" : ""}`)}
                        {fila("salud", salud === "fonasa" ? "Salud (Fonasa)" : "Salud (Isapre)", r.salud, "cl-resta", salud === "fonasa" ? "7 %" : r.salud > Math.round(r.imponible * 0.07) ? `plan de ${textoDeNumero(plan, { decimales: 2 })} UF` : "7 % (mayor que el plan)")}
                        {fila("cesantia", "Seguro de cesantía", r.cesantia, "cl-resta", contrato === "indefinido" ? porcentaje(p.cesantiaTrabajador.indefinido) : "lo paga el empleador")}
                        {fila("impuesto", "Impuesto único", r.impuesto, "cl-resta", r.factorTramo ? `tramo del ${porcentaje(r.factorTramo)}` : "exento")}
                        {r.noImponible ? fila("noimp", "Colación y movilización", r.noImponible) : null}
                        {fila("liquido", "Sueldo líquido", r.liquido, sentido === "bruto" ? "cl-total" : "")}
                    </dl>
                ) : <p className="cl-estado cl-mal" role="status">{monto !== null ? "Escribe un monto en pesos, por ejemplo 1.200.000." : ""}</p>}
                <p className="cl-nota">
                    Un mes normal, sin gratificación, horas extra, APV ni otros descuentos de tu contrato. UTM de {mesCL(utm.fecha)} ({pesos(utm.valor)}); topes imponibles con la UF del {fechaCL(ufTopes.fecha)} ({pesos(ufTopes.valor, 2)}){salud === "isapre" ? ` y el plan con la del ${fechaCL(uf.fecha)}` : ""}{ind ? "" : ", valores de referencia porque la fuente del día no respondió"}.
                    Parámetros vigentes desde {FUENTES_SUELDO.vigencia}: {FUENTES_SUELDO.texto}.
                </p>
                <p className="cl-nota" role="status">{fallo ? "No se pudo copiar: selecciona la cifra y cópiala a mano." : ""}</p>
            </div>
        </div>
    );
}
