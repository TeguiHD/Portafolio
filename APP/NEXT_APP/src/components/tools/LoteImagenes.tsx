"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { MesaBoton, MesaRail } from "@/components/tools/mesa/MesaRail";
import { MesaPasos, type EstadoPaso, type Paso } from "@/components/tools/mesa/MesaPasos";
import { MesaCabecera } from "@/components/tools/mesa/MesaCabecera";
import { IconoDescargar, IconoImagen } from "@/components/tools/mesa/MesaIcons";
import { exportarImagen, extensionDe, formatearPeso, medidasValidas, type AjustesImagen, type ImagenExportada } from "@/lib/tools/exportar-imagen";
import { descargarBlob, nombreArchivo } from "@/lib/tools/descargar";
import { crearZip } from "@/lib/tools/zip";

type Exito = { clave: string; ok: true; exportada: ImagenExportada; anchoOriginal: number; altoOriginal: number };
type ResultadoLote = Exito | { clave: string; ok: false; error: string };

interface LoteImagenesProps {
    archivos: readonly File[];
    ajustes: AjustesImagen;
    acento: string;
    /** «convertida», «comprimida»…: va en el nombre de cada archivo. */
    sufijo: string;
    pasos: Paso[];
    onCambiar: () => void;
    /** Panel de ajustes: el mismo que con una sola imagen. */
    children: ReactNode;
}

function ahorro(antes: number, despues: number): number {
    return antes > 0 ? Math.round((1 - despues / antes) * 100) : 0;
}

function textoAhorro(porcentaje: number): string {
    return porcentaje > 0 ? `${porcentaje}% menos peso` : porcentaje === 0 ? "Mismo peso" : `${Math.abs(porcentaje)}% más peso`;
}

function medidas(ancho: number, alto: number): string {
    return `${ancho} × ${alto}`;
}

/** Aplica los mismos ajustes a varias imágenes, una por una, y las entrega sueltas o en un ZIP. */
export function LoteImagenes({ archivos, ajustes, acento, sufijo, pasos, onCambiar, children }: LoteImagenesProps) {
    const clave = useMemo(() => JSON.stringify(ajustes), [ajustes]);
    const [resultados, setResultados] = useState<(ResultadoLote | undefined)[]>([]);
    const [actual, setActual] = useState<number | null>(null);
    const [empaquetando, setEmpaquetando] = useState<number | null>(null);
    const [zipDescargado, setZipDescargado] = useState<string | null>(null);
    const [zipError, setZipError] = useState<string | null>(null);
    const medidasInvalidas = ajustes.modo === "redimensionar" && !medidasValidas(ajustes.ancho, ajustes.alto);

    useEffect(() => {
        if (medidasInvalidas) return;
        const controlador = new AbortController();
        const { signal } = controlador;
        const temporizador = window.setTimeout(async () => {
            // Se sueltan los resultados anteriores antes de empezar: con 20 imágenes pueden sumar muchos MB.
            setResultados([]);
            // Una a la vez: decodificar 20 fotos juntas puede agotar la memoria del celular.
            for (let i = 0; i < archivos.length; i++) {
                if (signal.aborted) return;
                setActual(i);
                let resultado: ResultadoLote;
                let bitmap: ImageBitmap | null = null;
                try {
                    bitmap = await createImageBitmap(archivos[i]);
                    const exportada = await exportarImagen(bitmap, ajustes, { enLote: true, signal });
                    resultado = { clave, ok: true, exportada, anchoOriginal: bitmap.width, altoOriginal: bitmap.height };
                } catch (causa) {
                    if (signal.aborted) return;
                    resultado = { clave, ok: false, error: !bitmap ? "No se pudo abrir esta imagen." : causa instanceof Error ? causa.message : "No se pudo exportar." };
                } finally {
                    bitmap?.close();
                }
                if (signal.aborted) return;
                const listo: ResultadoLote = resultado;
                setResultados((previos) => {
                    const siguientes = previos.slice();
                    siguientes[i] = listo;
                    return siguientes;
                });
            }
            setActual(null);
        }, 450);
        return () => {
            controlador.abort();
            window.clearTimeout(temporizador);
        };
    }, [archivos, ajustes, clave, medidasInvalidas]);

    const vigentes = archivos.map((_, i) => (resultados[i]?.clave === clave ? resultados[i] : undefined));
    const total = archivos.length;
    const hechos = vigentes.filter(Boolean).length;
    const terminado = !medidasInvalidas && hechos === total;
    const exitosos = vigentes.filter((resultado): resultado is Exito => !!resultado?.ok);
    const fallidos = hechos - exitosos.length;
    const pesoAntes = archivos.reduce((suma, archivo) => suma + archivo.size, 0);
    const pesoAntesExitosos = archivos.reduce((suma, archivo, i) => suma + (vigentes[i]?.ok ? archivo.size : 0), 0);
    const pesoDespues = exitosos.reduce((suma, resultado) => suma + resultado.exportada.blob.size, 0);
    const nombreSalida = (archivo: File, resultado: Exito) => `${nombreArchivo(archivo.name, "imagen")}_${sufijo}.${extensionDe(resultado.exportada.blob.type)}`;

    const descargarZip = async () => {
        if (!terminado || !exitosos.length || empaquetando !== null) return;
        setZipError(null);
        setEmpaquetando(0);
        try {
            const entradas = vigentes.flatMap((resultado, i) => (resultado?.ok ? [{ nombre: nombreSalida(archivos[i], resultado), blob: resultado.exportada.blob }] : []));
            const zip = await crearZip(entradas, (porcentaje) => setEmpaquetando(Math.round(porcentaje)));
            descargarBlob(zip, `imagenes_${sufijo}s.zip`);
            setZipDescargado(clave);
        } catch {
            setZipError("No se pudo armar el ZIP. Descarga las imágenes una por una.");
        } finally {
            setEmpaquetando(null);
        }
    };

    const estado = medidasInvalidas
        ? "Escribe un ancho y un alto entre 1 y 16.000 px."
        : terminado
            ? fallidos ? `Listo · ${fallidos} con error` : "Listo"
            : actual !== null ? `Procesando ${actual + 1} de ${total}…` : "Preparando…";
    const estadosPasos: EstadoPaso[] = medidasInvalidas || (terminado && !exitosos.length) ? ["listo", "error", "pendiente"] : terminado ? ["listo", "listo", "listo"] : ["listo", "activo", "pendiente"];
    const ahorroTotal = ahorro(pesoAntesExitosos, pesoDespues);

    return (
        <section aria-label="Lote de imágenes" className="studio-panel mesa overflow-hidden" style={{ "--mesa-acento": acento } as CSSProperties}>
            <MesaCabecera nombre={`${total} imágenes`} detalle={`${formatearPeso(pesoAntes)} en total`}>
                <button type="button" onClick={() => { void descargarZip(); }} disabled={!terminado || !exitosos.length || empaquetando !== null} className="studio-button studio-button-primary">
                    {empaquetando !== null ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <IconoDescargar listo={zipDescargado === clave} />}<span>Descargar todo (ZIP)</span>
                </button>
            </MesaCabecera>
            <div className="mesa-cuerpo mesa-cuerpo-panel">
                <div className="mesa-columna">
                    <div className="space-y-2 border-b border-white/10 px-4 py-3">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-300"><span>{estado}</span><span className="tabular-nums text-slate-400">{hechos} de {total}</span></div>
                        <progress max={total} value={hechos} aria-label="Avance del lote" className="block w-full" style={{ accentColor: "var(--mesa-acento)" }} />
                    </div>
                    <ul aria-label="Imágenes del lote" className="max-h-[min(55vh,520px)] divide-y divide-white/10 overflow-y-auto">
                        {archivos.map((archivo, i) => {
                            const resultado = vigentes[i];
                            const exportada = resultado?.ok ? resultado.exportada : null;
                            const detalle: string[] = [];
                            if (resultado?.ok && exportada) {
                                detalle.push(`${formatearPeso(archivo.size)} → ${formatearPeso(exportada.blob.size)}`);
                                const cambio = resultado.anchoOriginal !== exportada.ancho || resultado.altoOriginal !== exportada.alto;
                                detalle.push(cambio ? `${medidas(resultado.anchoOriginal, resultado.altoOriginal)} → ${medidas(exportada.ancho, exportada.alto)}` : medidas(exportada.ancho, exportada.alto));
                                if (exportada.objetivo) detalle.push(exportada.objetivo.logrado ? `calidad ${exportada.calidad}%` : `no llegó a ${Math.round(exportada.objetivo.bytes / 1024)} KB`);
                            } else if (resultado && !resultado.ok) {
                                detalle.push(formatearPeso(archivo.size), `No se pudo: ${resultado.error}`);
                            } else {
                                // Con medidas inválidas el lote está detenido: ninguna imagen se está procesando.
                                detalle.push(formatearPeso(archivo.size), medidasInvalidas ? "En espera" : i === actual ? "Procesando…" : "En cola");
                            }
                            const porcentaje = exportada ? ahorro(archivo.size, exportada.blob.size) : null;
                            return (
                                <li key={`${i}-${archivo.name}`} className="flex items-center gap-3 px-4 py-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-slate-200">{archivo.name}</p>
                                        <p className="mt-1 text-[11px] leading-4 text-slate-400 tabular-nums">{detalle.join(" · ")}</p>
                                    </div>
                                    {porcentaje !== null && <span className="shrink-0 text-[11px] tabular-nums" style={{ color: porcentaje > 0 ? "var(--mesa-acento)" : "#94a3b8" }}>{porcentaje > 0 ? `−${porcentaje}%` : porcentaje === 0 ? "=" : `+${Math.abs(porcentaje)}%`}</span>}
                                    <button type="button" className="studio-icon-button shrink-0 disabled:opacity-30" aria-label={`Descargar ${archivo.name}`} disabled={!resultado?.ok} onClick={() => { if (resultado?.ok) descargarBlob(resultado.exportada.blob, nombreSalida(archivo, resultado)); }}>
                                        <IconoDescargar className="h-4 w-4" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <MesaPasos etiqueta="Progreso del lote" pasos={pasos} estados={estadosPasos} progreso={total ? hechos / total : 0} />
                    <div className="mesa-pie" aria-live="polite">
                        <span className="tabular-nums">{terminado && exitosos.length ? `${formatearPeso(pesoAntesExitosos)} → ${formatearPeso(pesoDespues)}` : `${formatearPeso(pesoAntes)} en total`}</span>
                        {terminado && exitosos.length > 0 && <span className="mesa-pie-estado" style={{ color: ahorroTotal > 0 ? "var(--mesa-acento)" : "#94a3b8" }}>{textoAhorro(ahorroTotal)}</span>}
                        {terminado && fallidos > 0 && <span>{fallidos === 1 ? "1 imagen no se pudo procesar y no va en el ZIP." : `${fallidos} imágenes no se pudieron procesar y no van en el ZIP.`}</span>}
                        {empaquetando !== null && <span role="status">Armando el ZIP… {empaquetando}%</span>}
                    </div>
                    {zipError && <p role="alert" className="border-t border-white/10 px-4 py-3 text-xs text-slate-300">{zipError}</p>}
                </div>
                <MesaRail etiqueta="Herramientas del lote">
                    <MesaBoton pista="Cambiar imágenes" onClick={onCambiar}><IconoImagen /></MesaBoton>
                </MesaRail>
                {children}
            </div>
        </section>
    );
}
