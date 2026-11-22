"use client";

import { useMemo, useState } from "react";
import { formatearRut, generarRut, validarRut } from "@/lib/chile/rut";
import { IconoCopiar, useCopiarHerramienta } from "./comunes";
import "./chile.css";

type Modo = "uno" | "lista";
const SLUG = "rut";

/** Validador de RUT: uno a la vez o una lista entera, y RUT de prueba para formularios. Todo en el navegador. */
export function ValidadorRut() {
    const [modo, setModo] = useState<Modo>("uno");
    const [texto, setTexto] = useState("12.345.678-5");
    const [lista, setLista] = useState("12.345.678-5\n7.654.321-6\n11.111.111-2\n6-k");
    const [prueba, setPrueba] = useState<string[]>([]);
    const { copiado, fallo, copiar } = useCopiarHerramienta(SLUG);

    const uno = useMemo(() => (texto.trim() ? validarRut(texto) : null), [texto]);
    const revisados = useMemo(() => lista.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 2000).map((l) => ({ original: l, r: validarRut(l) })), [lista]);
    const validos = revisados.filter((x) => x.r.valido);

    return (
        <div className="cl">
            <div className="cl-segmento" role="group" aria-label="Qué quieres hacer">
                <button type="button" aria-pressed={modo === "uno"} onClick={() => setModo("uno")}>Validar un RUT</button>
                <button type="button" aria-pressed={modo === "lista"} onClick={() => setModo("lista")}>Revisar una lista</button>
            </div>

            {modo === "uno" ? (
                <div className="cl-panel">
                    <div>
                        <label className="cl-etiqueta" htmlFor="rut-uno">RUT <small>con o sin puntos y guion</small></label>
                        <input id="rut-uno" className="cl-entrada" value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 20))} inputMode="text" autoComplete="off" spellCheck={false} aria-describedby="rut-estado" />
                    </div>
                    <p id="rut-estado" className={`cl-estado ${uno ? (uno.valido ? "cl-ok" : "cl-mal") : ""}`} role="status">
                        {!uno ? "" : uno.valido ? `RUT válido: ${formatearRut(texto)}` : uno.motivo}
                    </p>
                    {uno && (uno.valido || uno.esperado) ? (
                        <dl className="cl-filas">
                            <div className="cl-fila"><dt>Con formato</dt><dd>{uno.valido ? formatearRut(texto) : `${formatearRut(`${uno.cuerpo}${uno.esperado}`)}`}
                                <button type="button" className="cl-copiar" aria-label="Copiar el RUT con formato" onClick={() => void copiar(uno.valido ? formatearRut(texto) : formatearRut(`${uno.cuerpo}${uno.esperado}`), "formato")}><IconoCopiar hecho={copiado === "formato"} /></button></dd></div>
                            <div className="cl-fila"><dt>Sin puntos ni guion</dt><dd>{`${uno.cuerpo}${uno.valido ? uno.dv : uno.esperado}`}
                                <button type="button" className="cl-copiar" aria-label="Copiar el RUT sin formato" onClick={() => void copiar(`${uno.cuerpo}${uno.valido ? uno.dv : uno.esperado}`, "limpio")}><IconoCopiar hecho={copiado === "limpio"} /></button></dd></div>
                            <div className="cl-fila"><dt>Dígito verificador</dt><dd>{uno.valido ? uno.dv : uno.esperado}</dd></div>
                        </dl>
                    ) : null}
                </div>
            ) : (
                <div className="cl-panel">
                    <div>
                        <label className="cl-etiqueta" htmlFor="rut-lista">Un RUT por línea <small>hasta 2.000</small></label>
                        <textarea id="rut-lista" className="cl-entrada" value={lista} onChange={(e) => setLista(e.target.value.slice(0, 40000))} spellCheck={false} />
                    </div>
                    <p className="cl-estado" role="status">{revisados.length ? `${validos.length} de ${revisados.length} son válidos.` : "Pega tu lista para revisarla."}</p>
                    {revisados.length ? (
                        <ul className="cl-lista" aria-label="Resultado de la lista">
                            {revisados.slice(0, 200).map((x, i) => (
                                <li key={i}><span>{x.r.valido ? formatearRut(x.original) : x.original}</span><span className={x.r.valido ? "cl-ok" : "cl-mal"}>{x.r.valido ? "Válido" : x.r.esperado ? `Debería terminar en ${x.r.esperado}` : "No es un RUT"}</span></li>
                            ))}
                        </ul>
                    ) : null}
                    {revisados.length > 200 ? <p className="cl-nota">Se muestran los primeros 200; copiar incluye todos los válidos.</p> : null}
                    <div className="cl-fila-botones">
                        <button type="button" className="cl-boton" disabled={!validos.length} onClick={() => void copiar(validos.map((x) => formatearRut(x.original)).join("\n"), "validos")}>
                            {copiado === "validos" ? "Copiados" : `Copiar los ${validos.length} válidos`}
                        </button>
                    </div>
                </div>
            )}

            <div className="cl-panel">
                <p className="cl-etiqueta" style={{ margin: 0 }}>RUT de prueba <small>válidos y al azar, para probar formularios</small></p>
                <div className="cl-fila-botones">
                    <button type="button" className="cl-boton" onClick={() => setPrueba(Array.from({ length: 5 }, () => generarRut()))}>Generar 5</button>
                    {prueba.length ? <button type="button" className="cl-boton" onClick={() => void copiar(prueba.join("\n"), "prueba")}>{copiado === "prueba" ? "Copiados" : "Copiar"}</button> : null}
                </div>
                {prueba.length ? <ul className="cl-lista" aria-label="RUT de prueba">{prueba.map((r) => <li key={r}><span>{r}</span><span>de prueba</span></li>)}</ul> : null}
                <p className="cl-nota">Son números que cumplen el cálculo del dígito verificador; pueden coincidir con el RUT de una persona real. Úsalos solo para probar.</p>
            </div>
            <p className="cl-nota" role="status">{fallo ? "No se pudo copiar: selecciona el texto y cópialo a mano." : ""}</p>
        </div>
    );
}
