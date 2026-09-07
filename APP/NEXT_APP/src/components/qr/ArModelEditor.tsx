"use client";

import { useState } from "react";
import { Box, ExternalLink, Eye, Smartphone } from "lucide-react";
import { arQuery, parseArParams } from "@/lib/ar-launch";
import type { ARData } from "@/utils/qr-data-formats";

import { AR_DEMO } from "@/lib/ar-demo";

export function arValidation(data: ARData): string | null {
    const model = parseArParams({ t: data.title, glb: data.glb, usdz: data.usdz, p: data.poster });
    if (data.glb?.trim() && !model?.glb) return "El modelo 3D debe ser una URL HTTPS pública que termine en .glb o .gltf, sin usuario ni contraseña en la URL.";
    if (data.usdz?.trim() && !model?.usdz) return "El archivo para iPhone debe ser una URL HTTPS que termine en .usdz.";
    if (data.poster?.trim() && !model?.poster) return "El póster debe usar HTTPS y terminar en .png, .jpg, .jpeg o .webp.";
    return null;
}

export function ArModelEditor({ data, onChange }: { data: ARData; onChange: (value: ARData) => void }) {
    const [preview, setPreview] = useState<string | null>(null);
    const model = parseArParams({ t: data.title, glb: data.glb, usdz: data.usdz, p: data.poster });
    const invalid = arValidation(data);
    const query = model ? arQuery(model) : "";
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-4">
                <div className="flex items-center gap-3"><Box className="h-7 w-7 shrink-0 text-violet-300" aria-hidden="true" /><div><p className="text-sm font-medium text-white">Realidad aumentada</p><p className="mt-1 text-xs text-slate-400">Coloca tu modelo en el entorno al abrir el QR.</p></div></div>
                <button type="button" onClick={() => { onChange(AR_DEMO); setPreview(null); }} className="studio-button border-violet-300/30 text-violet-200">Usar modelo de ejemplo</button>
            </div>
            <div className="studio-field">
                <label htmlFor="ar-title">Nombre de la experiencia</label>
                <input id="ar-title" aria-describedby="ar-title-hint" value={data.title} maxLength={80} placeholder="Ej. Sillón de diseño, plato del día…" onChange={(event) => onChange({ ...data, title: event.target.value })} />
                <small id="ar-title-hint">Este nombre aparece cuando alguien abre tu QR.</small>
            </div>
            <div className="studio-field">
                <label htmlFor="ar-glb">Modelo 3D · GLB / glTF</label>
                <input id="ar-glb" aria-describedby="ar-glb-hint" type="url" value={data.glb ?? ""} placeholder="https://tu-sitio.com/producto.glb" onChange={(event) => onChange({ ...data, glb: event.target.value })} />
                <small id="ar-glb-hint">Para Android y la vista 3D. URL pública HTTPS.</small>
            </div>
            <div className="studio-field">
                <label htmlFor="ar-usdz">Versión para iPhone y iPad · USDZ</label>
                <input id="ar-usdz" aria-describedby="ar-usdz-hint" type="url" value={data.usdz ?? ""} placeholder="https://tu-sitio.com/producto.usdz" onChange={(event) => onChange({ ...data, usdz: event.target.value })} />
                <small id="ar-usdz-hint">Para colocar el objeto en el entorno con iPhone o iPad.</small>
            </div>
            <details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-xs font-medium text-slate-300">Imagen de portada (opcional)</summary><div className="studio-field mt-3">
                <label htmlFor="ar-poster">URL del póster</label>
                <input id="ar-poster" type="url" value={data.poster ?? ""} placeholder="https://tu-sitio.com/producto.webp" onChange={(event) => onChange({ ...data, poster: event.target.value })} />
            </div></details>
            <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-3 text-xs"><Smartphone size={15} aria-hidden="true" /><span className="flex-1">Android / vista 3D</span><span className={model?.glb ? "text-teal-300" : "text-slate-500"}>{model?.glb ? "Formato incluido" : "Falta GLB"}</span></div>
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-3 text-xs"><Smartphone size={15} aria-hidden="true" /><span className="flex-1">iPhone / iPad</span><span className={model?.usdz ? "text-teal-300" : "text-slate-500"}>{model?.usdz ? "Formato incluido" : "Falta USDZ"}</span></div>
            </div>
            {invalid && <p role="alert" className="text-sm text-amber-200">{invalid}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!model?.glb || !!invalid} aria-expanded={preview === query && !!preview} aria-controls="ar-model-preview" onClick={() => setPreview(preview === query ? null : query)} className="studio-button"><Eye size={15} aria-hidden="true" />{preview === query && preview ? "Cerrar vista previa" : "Previsualizar modelo 3D"}</button>
                {model && !invalid && <a href={`/ar?${query}`} target="_blank" rel="noopener noreferrer" className="studio-button"><ExternalLink size={15} aria-hidden="true" />Probar experiencia<span className="sr-only">(otra pestaña)</span></a>}
            </div>
            {preview && preview === query && !invalid && <iframe id="ar-model-preview" key={preview} src={`/ar/preview?${preview}`} title="Vista previa interactiva del modelo 3D" className="h-[430px] w-full rounded-xl border border-white/10" referrerPolicy="no-referrer" />}
            <details className="text-xs text-slate-400"><summary className="min-h-11 cursor-pointer content-center">Cómo preparar y probar el modelo</summary><p className="pt-2 leading-relaxed">Aloja los modelos con HTTPS y acceso público; la vista 3D necesita CORS. Para probar el anclaje, abre el QR en un móvil compatible y toca «Ver en mi espacio». La previsualización de este editor funciona sin cámara.</p></details>
            {data.glb === AR_DEMO.glb && <p className="text-[11px] text-slate-500">Modelo Astronaut de Poly, licencia CC BY. <a href="https://modelviewer.dev/examples/augmentedreality/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Fuente y atribución</a>.</p>}
        </div>
    );
}
