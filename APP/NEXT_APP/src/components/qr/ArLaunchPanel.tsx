"use client";

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { detectPlatform, sceneViewerIntent, type ArModel, type ArPlatform } from "@/lib/ar-launch";

const LAUNCH = "inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-teal-200 px-6 py-3 text-base font-semibold text-teal-950 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300";

/** Native world tracking belongs to Quick Look / Scene Viewer, not the inline 3D preview. */
export function ArLaunchPanel({ model, initialPlatform, qrSvg }: { model: ArModel; initialPlatform: ArPlatform; qrSvg: string }) {
    const [platform, setPlatform] = useState(initialPlatform);
    useEffect(() => { setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints)); }, []);
    const hasNativeModel = platform === "ios" ? !!model.usdz : platform === "android" && !!model.glb;

    return (
        <section aria-labelledby="ar-placement-title" className="mt-6 rounded-2xl border border-teal-300/20 bg-teal-300/[0.04] p-5 sm:p-7">
            <h2 id="ar-placement-title" className="text-xl font-semibold text-white">Colócalo en tu espacio</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-300">Pon el objeto sobre una mesa o el suelo y camina a su alrededor. Al mover el teléfono, lo verás desde otro ángulo mientras permanece en el lugar que elegiste.</p>

            <div className="mt-6" data-ar-platform={platform}>
                {platform === "ios" && model.usdz ? (
                    // Quick Look requires a single img/picture child. The label is a CSS pseudo-element.
                    <a rel="ar" href={model.usdz} aria-label="Ver en mi espacio" className={`${LAUNCH} after:content-[attr(aria-label)]`}>
                        <img src="/images/ar/place-model.svg" alt="" width={24} height={24} />
                    </a>
                ) : platform === "android" && model.glb ? (
                    <a href={sceneViewerIntent(model.glb, model.title)} className={LAUNCH}><ScanLine size={24} aria-hidden="true" />Ver en mi espacio</a>
                ) : platform !== "other" ? (
                    <p role="status" className="text-sm leading-relaxed text-amber-200">Este enlace no incluye {platform === "ios" ? "el archivo USDZ para iPhone o iPad" : "el archivo GLB o glTF para Android"}. Pide a quien creó el QR que añada esa versión del modelo.</p>
                ) : (
                    <div>
                        <p className="text-sm text-slate-300">Escanea este QR con la cámara de tu móvil y abre el enlace.</p>
                        <div className="mx-auto mt-4 w-44 overflow-hidden rounded-xl bg-white [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="Código QR para abrir este modelo en el móvil" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    </div>
                )}
                {hasNativeModel && <p className="mt-3 text-xs text-slate-400">{platform === "ios" ? "Abre Quick Look de Apple. Si muestra la pestaña Objeto, cambia a RA." : "Abre Scene Viewer de Google en modo de realidad aumentada. Si tu móvil no admite AR, puede mostrar solo la vista 3D."}</p>}
            </div>

            <ol className="mt-7 space-y-3 border-t border-white/10 pt-5 text-left text-sm leading-relaxed text-slate-300">
                <li><span className="font-semibold text-teal-200">1. Abre la experiencia.</span> Toca «Ver en mi espacio» y permite usar la cámara si el visor lo solicita.</li>
                <li><span className="font-semibold text-teal-200">2. Encuentra una superficie.</span> Mueve el teléfono lentamente sobre una mesa o el suelo con buena iluminación. Sigue la indicación del visor para colocar el objeto.</li>
                <li><span className="font-semibold text-teal-200">3. Explora a tu alrededor.</span> Acércate o desplázate para ver otra perspectiva. Usa los gestos del visor para ajustar la posición o el tamaño.</li>
            </ol>
            <p className="mt-4 text-left text-xs leading-relaxed text-slate-400">Después de abrir el enlace no necesitas mantener el QR frente a la cámara. El seguimiento lo hace el visor del dispositivo sobre el entorno.</p>
            <details className="mt-5 border-t border-white/10 pt-4 text-left">
                <summary className="min-h-11 cursor-pointer text-sm text-slate-300">¿No aparece la cámara o detectamos otro dispositivo?</summary>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">Si abriste el enlace dentro de una red social, prueba abrirlo en Safari en iPhone/iPad o Chrome en Android. En Android se necesitan un dispositivo compatible y los servicios de AR de Google actualizados. Elegir un dispositivo aquí no añade compatibilidad al navegador.</p>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Elegir dispositivo">
                    {([ ["ios", "iPhone / iPad"], ["android", "Android"], ["other", "Computador"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={platform === value} onClick={() => setPlatform(value)} className="min-h-11 rounded-lg border border-white/15 px-3 text-xs text-slate-200 hover:bg-white/10 aria-pressed:border-teal-300/60 aria-pressed:text-teal-200">{label}</button>)}
                </div>
            </details>
        </section>
    );
}
