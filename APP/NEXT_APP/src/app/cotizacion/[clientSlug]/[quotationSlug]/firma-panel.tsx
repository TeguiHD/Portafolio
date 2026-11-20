"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { X, Loader2, PenLine, ImageUp, Eraser, Check } from "lucide-react";
import { formatRut, validateRut } from "@/lib/rut";
import { firmarCotizacionAction } from "./actions";
import type { FormularioFirma } from "@/lib/formulario-firma";

const TINTA = "#1e2a5a";
const MAX_BASE64 = 780_000; // bajo el límite que acepta el servidor
type Modo = "dibujar" | "imagen";
type Punto = { x: number; y: number };

interface Props {
    clientSlug: string;
    quotationSlug: string;
    folio: string;
    projectName: string;
    huella: string;
    formulario: FormularioFirma;
    onClose: () => void;
}

/** Recorta los trazos a su contorno y los devuelve como PNG transparente. */
function trazosAPng(trazos: Punto[][], grosor: number): string | null {
    const puntos = trazos.flat();
    if (puntos.length < 2) return null;
    const margen = grosor * 3;
    const minX = Math.min(...puntos.map((p) => p.x)) - margen;
    const minY = Math.min(...puntos.map((p) => p.y)) - margen;
    const maxX = Math.max(...puntos.map((p) => p.x)) + margen;
    const maxY = Math.max(...puntos.map((p) => p.y)) + margen;
    const escala = 2;
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.max(1, Math.ceil((maxX - minX) * escala));
    lienzo.height = Math.max(1, Math.ceil((maxY - minY) * escala));
    const ctx = lienzo.getContext("2d");
    if (!ctx) return null;
    ctx.scale(escala, escala);
    ctx.translate(-minX, -minY);
    dibujarTrazos(ctx, trazos, grosor);
    return lienzo.toDataURL("image/png");
}

function dibujarTrazos(ctx: CanvasRenderingContext2D, trazos: Punto[][], grosor: number) {
    ctx.strokeStyle = TINTA;
    ctx.fillStyle = TINTA;
    ctx.lineWidth = grosor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const trazo of trazos) {
        if (trazo.length === 1) {
            ctx.beginPath();
            ctx.arc(trazo[0].x, trazo[0].y, grosor / 2, 0, Math.PI * 2);
            ctx.fill();
            continue;
        }
        ctx.beginPath();
        ctx.moveTo(trazo[0].x, trazo[0].y);
        for (let i = 1; i < trazo.length - 1; i++) {
            const medio = { x: (trazo[i].x + trazo[i + 1].x) / 2, y: (trazo[i].y + trazo[i + 1].y) / 2 };
            ctx.quadraticCurveTo(trazo[i].x, trazo[i].y, medio.x, medio.y);
        }
        const ultimo = trazo[trazo.length - 1];
        ctx.lineTo(ultimo.x, ultimo.y);
        ctx.stroke();
    }
}

/** Una foto o imagen de la firma: se achica, el fondo claro se vuelve transparente y sale en PNG. */
async function imagenAPng(archivo: File): Promise<string> {
    if (!/^image\/(png|jpeg|webp)$/.test(archivo.type)) throw new Error("Sube una imagen PNG, JPG o WEBP.");
    if (archivo.size > 8 * 1024 * 1024) throw new Error("La imagen pesa más de 8 MB.");
    const url = URL.createObjectURL(archivo);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error("No se pudo leer la imagen."));
            i.src = url;
        });
        let escala = Math.min(1, 1200 / img.naturalWidth, 600 / img.naturalHeight);
        for (let intento = 0; intento < 5; intento++) {
            const lienzo = document.createElement("canvas");
            lienzo.width = Math.max(1, Math.round(img.naturalWidth * escala));
            lienzo.height = Math.max(1, Math.round(img.naturalHeight * escala));
            const ctx = lienzo.getContext("2d");
            if (!ctx) throw new Error("Tu navegador no pudo procesar la imagen.");
            ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
            const pixeles = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
            const d = pixeles.data;
            for (let p = 0; p < d.length; p += 4) {
                const luz = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
                if (luz > 225) d[p + 3] = 0;
            }
            ctx.putImageData(pixeles, 0, 0);
            const png = lienzo.toDataURL("image/png");
            if (png.length - "data:image/png;base64,".length <= MAX_BASE64) return png;
            escala *= 0.7;
        }
        throw new Error("La imagen es demasiado grande. Prueba con una más pequeña.");
    } finally {
        URL.revokeObjectURL(url);
    }
}

export default function PanelFirma({ clientSlug, quotationSlug, folio, projectName, huella, formulario, onClose }: Props) {
    const idTitulo = useId();
    const idRut = useId();
    const idNombre = useId();
    const idAcepta = useId();
    const [nombre, setNombre] = useState("");
    const [rut, setRut] = useState("");
    const [rutTocado, setRutTocado] = useState(false);
    const [modo, setModo] = useState<Modo>("dibujar");
    const [trazos, setTrazos] = useState<Punto[][]>([]);
    const [imagen, setImagen] = useState<string | null>(null);
    const [acepta, setAcepta] = useState(false);
    // Lo que pide el documento: datos de texto o RUT, y opciones a marcar.
    const [respuestas, setRespuestas] = useState<Record<string, string>>({});
    const responder = (clave: string, valor: string) => setRespuestas((r) => ({ ...r, [clave]: valor }));
    const idFormulario = useId();
    const [error, setError] = useState("");
    const [listo, setListo] = useState(false);
    const [pendiente, startTransition] = useTransition();

    const lienzoRef = useRef<HTMLCanvasElement>(null);
    const dibujando = useRef(false);
    const primerCampo = useRef<HTMLInputElement>(null);
    const GROSOR = 2.6;

    // El foco parte en el primer campo, una sola vez. Antes iba en el mismo efecto que Escape, que se repetía al cambiar
    // `pendiente`: al pulsar «Firmar y aceptar» el foco saltaba al nombre y, en el celular, se abría el teclado tapando
    // el resultado.
    useEffect(() => { primerCampo.current?.focus(); }, []);

    // Escape cierra (no mientras se guarda la firma) y el fondo no se desplaza mientras el panel está abierto.
    const pendienteRef = useRef(false);
    pendienteRef.current = pendiente;
    const cerrarRef = useRef(onClose);
    cerrarRef.current = onClose;
    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape" && !pendienteRef.current) cerrarRef.current(); };
        window.addEventListener("keydown", alTeclear);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", alTeclear);
            document.body.style.overflow = overflow;
        };
    }, []);

    // El lienzo se redibuja con los trazos guardados, así que cambiar el tamaño no borra la firma.
    const trazosRef = useRef<Punto[][]>([]);
    trazosRef.current = trazos;
    const redibujar = useCallback(() => {
        const lienzo = lienzoRef.current;
        if (!lienzo) return;
        const rect = lienzo.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // Se redibuja en cada movimiento del dedo: el lienzo solo se redimensiona si cambió de tamaño (asignar el ancho
        // reserva un búfer nuevo, y en un celular eso por cada punto se notaba al firmar).
        const ancho = Math.round(rect.width * dpr), alto = Math.round(rect.height * dpr);
        if (lienzo.width !== ancho || lienzo.height !== alto) {
            lienzo.width = ancho;
            lienzo.height = alto;
        }
        const ctx = lienzo.getContext("2d");
        if (!ctx) return;
        // Se limpia el búfer entero (en píxeles reales) y luego se dibuja en píxeles CSS.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, lienzo.width, lienzo.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dibujarTrazos(ctx, trazosRef.current, GROSOR);
    }, []);

    useEffect(() => {
        if (modo !== "dibujar") return;
        const lienzo = lienzoRef.current;
        if (!lienzo) return;
        const observador = new ResizeObserver(redibujar);
        observador.observe(lienzo);
        return () => observador.disconnect();
    }, [modo, redibujar]);

    useEffect(() => { if (modo === "dibujar") redibujar(); }, [trazos, modo, redibujar]);

    // Los puntos se limitan al lienzo: con setPointerCapture el trazo sigue aunque el dedo salga.
    const punto = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
            y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
        };
    };

    const alBajar = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dibujando.current = true;
        // La posición se lee aquí: dentro del actualizador, React ya soltó el evento.
        const inicio = punto(e);
        setTrazos((t) => [...t, [inicio]]);
    };
    const alMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dibujando.current) return;
        e.preventDefault();
        const p = punto(e);
        setTrazos((t) => {
            if (t.length === 0) return t;
            const copia = t.slice();
            copia[copia.length - 1] = [...copia[copia.length - 1], p];
            return copia;
        });
    };
    const alSoltar = () => { dibujando.current = false; };

    const alElegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setError("");
        try {
            setImagen(await imagenAPng(archivo));
        } catch (err) {
            setImagen(null);
            setError(err instanceof Error ? err.message : "No se pudo leer la imagen.");
        }
    };

    const rutValido = validateRut(rut);
    const hayFirma = modo === "dibujar" ? trazos.flat().length >= 2 : Boolean(imagen);
    const camposListos = formulario.campos.every((c) => c.tipo === "rut"
        ? validateRut(respuestas[c.clave] || "")
        : (respuestas[c.clave] || "").trim().length >= 2);
    const opcionesListas = formulario.opciones.every((o) => o.valores.includes(respuestas[o.clave] || ""));
    const puedeFirmar = nombre.trim().length >= 3 && rutValido && hayFirma && acepta && camposListos && opcionesListas && !pendiente;
    // El botón deshabilitado no explicaba por qué: se dice qué falta, en el orden del formulario.
    const faltan = [
        nombre.trim().length < 3 && "tu nombre",
        !rutValido && "un RUT válido",
        !camposListos && "los datos que pide el documento",
        !opcionesListas && "elegir las opciones",
        !hayFirma && "tu firma",
        !acepta && "marcar que aceptas",
    ].filter((x): x is string => Boolean(x));
    const textoFaltan = faltan.length > 1 ? `${faltan.slice(0, -1).join(", ")} y ${faltan[faltan.length - 1]}` : faltan[0] ?? "";
    // Con algo ya escrito o dibujado, un toque fuera del panel no lo cierra (en el celular se perdía todo por un roce).
    const hayAvance = Boolean(nombre || rut || trazos.length || imagen || acepta || Object.keys(respuestas).length);
    const idFaltan = useId();

    const firmar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!puedeFirmar) return;
        const png = modo === "dibujar" ? trazosAPng(trazos, GROSOR) : imagen;
        if (!png) {
            setError("Dibuja tu firma antes de continuar.");
            return;
        }
        setError("");
        startTransition(async () => {
            let r: Awaited<ReturnType<typeof firmarCotizacionAction>>;
            try {
                r = await firmarCotizacionAction(clientSlug, quotationSlug, {
                    nombre: nombre.trim(),
                    rut,
                    imagen: png,
                    acepta,
                    huella,
                    respuestas,
                });
            } catch {
                setError("No hubo conexión con el servidor. Recarga la página e inténtalo de nuevo.");
                return;
            }
            if (r.success) {
                setListo(true);
                // Recarga completa: así el documento que se ve y se descarga es el firmado recién generado.
                setTimeout(() => window.location.reload(), 1400);
            } else {
                setError(r.error);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !pendiente && !hayAvance) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby={idTitulo}
                className="w-full sm:max-w-lg max-h-[94vh] overflow-y-auto bg-white text-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl">
                <div className="flex items-start justify-between gap-4 px-6 pt-6">
                    <div>
                        <h2 id={idTitulo} className="text-lg font-bold text-slate-900">Firmar {formulario.documento}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Folio {folio}: {projectName}</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={pendiente} aria-label="Cerrar"
                        className="p-2 -m-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {listo ? (
                    <div className="px-6 py-12 text-center" role="status">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center mx-auto mb-3">
                            <Check size={24} />
                        </div>
                        <p className="font-semibold text-slate-900">Firma registrada</p>
                        <p className="text-sm text-slate-500 mt-1">Ya puedes ver y descargar la versión firmada.</p>
                    </div>
                ) : (
                    <form onSubmit={firmar} className="px-6 pb-6 pt-5 space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={idNombre} className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                                <input id={idNombre} ref={primerCampo} value={nombre} onChange={(e) => setNombre(e.target.value)}
                                    autoComplete="name" maxLength={120} required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                            </div>
                            <div>
                                <label htmlFor={idRut} className="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                                <input id={idRut} value={rut} onChange={(e) => setRut(formatRut(e.target.value))}
                                    onBlur={() => setRutTocado(true)} inputMode="text" placeholder="12.345.678-9" maxLength={12} required
                                    aria-invalid={rutTocado && !rutValido}
                                    className={`w-full rounded-lg border px-3 py-2.5 text-slate-900 outline-none focus:ring-2 ${rutTocado && rut && !rutValido
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                        : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"}`} />
                                {rutTocado && rut && !rutValido && (
                                    <p className="text-xs text-red-600 mt-1">Revisa el dígito verificador.</p>
                                )}
                            </div>
                        </div>

                        {formulario.campos.length > 0 && (
                            <div className="grid sm:grid-cols-2 gap-4">
                                {formulario.campos.map((campo, i) => {
                                    const valor = respuestas[campo.clave] || "";
                                    const malo = campo.tipo === "rut" && valor.length > 0 && !validateRut(valor);
                                    return (
                                        <div key={campo.clave} className={campo.tipo === "texto" && formulario.campos.length % 2 === 1 && i === 0 ? "sm:col-span-2" : ""}>
                                            <label htmlFor={`${idFormulario}-${campo.clave}`} className="block text-sm font-medium text-slate-700 mb-1">{campo.etiqueta}</label>
                                            <input id={`${idFormulario}-${campo.clave}`} value={valor} required
                                                onChange={(e) => responder(campo.clave, campo.tipo === "rut" ? formatRut(e.target.value) : e.target.value)}
                                                maxLength={campo.tipo === "rut" ? 12 : 120} placeholder={campo.tipo === "rut" ? "76.123.456-7" : undefined}
                                                aria-invalid={malo}
                                                className={`w-full rounded-lg border px-3 py-2.5 text-slate-900 outline-none focus:ring-2 ${malo
                                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"}`} />
                                            {malo && <p className="text-xs text-red-600 mt-1">Revisa el dígito verificador.</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {formulario.opciones.map((opcion) => (
                            <fieldset key={opcion.clave}>
                                <legend className="text-sm font-medium text-slate-700 mb-2">{opcion.etiqueta}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {opcion.valores.map((valor) => {
                                        const elegido = respuestas[opcion.clave] === valor;
                                        return (
                                            <label key={valor} className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/40 ${elegido
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-medium" : "border-slate-300 text-slate-700 hover:border-slate-400"}`}>
                                                <input type="radio" name={`${idFormulario}-${opcion.clave}`} value={valor} checked={elegido}
                                                    onChange={() => responder(opcion.clave, valor)} className="sr-only" />
                                                {valor}
                                            </label>
                                        );
                                    })}
                                </div>
                            </fieldset>
                        ))}

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-700">Tu firma</span>
                                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm" role="tablist" aria-label="Cómo firmar">
                                    {([["dibujar", "Dibujar", PenLine], ["imagen", "Subir imagen", ImageUp]] as const).map(([valor, texto, Icono]) => (
                                        <button key={valor} type="button" role="tab" aria-selected={modo === valor}
                                            onClick={() => { setModo(valor); setError(""); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${modo === valor
                                                ? "bg-white text-slate-900 shadow-sm font-medium" : "text-slate-500 hover:text-slate-800"}`}>
                                            <Icono size={14} /> {texto}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {modo === "dibujar" ? (
                                <div className="relative">
                                    <canvas ref={lienzoRef} aria-label="Espacio para dibujar tu firma"
                                        onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
                                        className="block w-full h-44 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 touch-none cursor-crosshair" />
                                    {trazos.length === 0 && (
                                        <p className="absolute inset-0 grid place-items-center text-sm text-slate-400 pointer-events-none select-none">
                                            Firma aquí con el dedo o el mouse
                                        </p>
                                    )}
                                    {trazos.length > 0 && (
                                        <button type="button" onClick={() => setTrazos([])}
                                            className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-white/90 border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:text-red-600">
                                            <Eraser size={12} /> Borrar
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 h-44 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-indigo-400 transition-colors overflow-hidden">
                                    {imagen ? (
                                        <img src={imagen} alt="Vista previa de tu firma" className="max-h-32 max-w-[85%] object-contain" />
                                    ) : (
                                        <>
                                            <ImageUp className="text-slate-400" size={24} />
                                            <span className="text-sm text-slate-600 font-medium">Elegir imagen de tu firma</span>
                                            <span className="text-xs text-slate-400">Una foto sobre papel blanco funciona bien</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={alElegirArchivo} />
                                </label>
                            )}
                        </div>

                        <label htmlFor={idAcepta} className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                            <input id={idAcepta} type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <span>{formulario.acepta || `Leí y acepto la propuesta folio ${folio}.`}</span>
                        </label>

                        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                        <button type="submit" disabled={!puedeFirmar} aria-describedby={!pendiente && faltan.length ? idFaltan : undefined}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {pendiente ? <><Loader2 size={16} className="animate-spin" /> Firmando…</> : "Firmar y aceptar"}
                        </button>
                        {!pendiente && faltan.length ? <p id={idFaltan} className="-mt-2 text-sm text-slate-500">Para firmar falta: {textoFaltan}.</p> : null}

                        <p className="text-xs text-slate-400 leading-relaxed">
                            Tu firma queda registrada con la fecha, la hora y una huella del documento, como firma electrónica simple según la Ley 19.799.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
