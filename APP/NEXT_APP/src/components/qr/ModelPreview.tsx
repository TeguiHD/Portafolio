"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { Box, RotateCcw, LoaderCircle, AlertCircle } from "lucide-react";
import type { ArModel } from "@/lib/ar-launch";

export function ModelPreview({ model, autoLoad = false }: { model: ArModel; autoLoad?: boolean }) {
    const [active, setActive] = useState(autoLoad);
    const [ready, setReady] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [attempt, setAttempt] = useState(0);
    const viewer = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!active || !model.glb) return;
        let cancelled = false;
        setStatus("loading");
        import("@google/model-viewer").then(() => {
            if (!cancelled) setReady(true);
        }).catch(() => { if (!cancelled) setStatus("error"); });
        return () => { cancelled = true; };
    }, [active, model.glb, attempt]);

    useEffect(() => {
        const element = viewer.current;
        if (!ready || !active || !model.glb || !element) return;
        setStatus("loading");
        let finished = false;
        const loaded = () => { finished = true; setStatus("loaded"); };
        const failed = () => { finished = true; setStatus("error"); };
        element.addEventListener("load", loaded);
        element.addEventListener("error", failed);
        element.setAttribute("src", model.glb);
        const timer = window.setTimeout(() => { if (!finished) setStatus("error"); }, 45_000);
        return () => {
            window.clearTimeout(timer);
            element.removeEventListener("load", loaded);
            element.removeEventListener("error", failed);
        };
    }, [ready, active, model.glb, attempt]);

    if (!model.glb) return <p className="p-6 text-sm text-slate-400">La vista 3D del navegador necesita un archivo GLB o glTF. Tu USDZ puede abrirse en el visor de iPhone o iPad.</p>;

    return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111923] text-slate-300">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs"><span className="flex items-center gap-2"><Box size={15} aria-hidden="true" />Vista 3D interactiva</span><span className="text-slate-500">GLB / glTF</span></div>
            <div className="relative h-[320px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent_75%)]">
                {active && ready && createElement("model-viewer", {
                    key: `${model.glb}-${attempt}`, ref: viewer, alt: model.title,
                    "camera-controls": true, "touch-action": "pan-y", "shadow-intensity": "1",
                    "environment-image": "neutral", "interaction-prompt": "none",
                    style: { width: "100%", height: "100%", backgroundColor: "transparent" },
                })}
                {!active && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"><Box className="h-16 w-16 text-violet-300" strokeWidth={1} aria-hidden="true" /><p className="text-sm text-slate-400">Explora el modelo antes de verlo en tu espacio.</p><button type="button" onClick={() => setActive(true)} className="min-h-11 rounded-lg bg-violet-200 px-5 text-sm font-semibold text-violet-950">Cargar vista 3D</button></div>}
                {active && status === "loading" && <div role="status" className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-slate-950/90 px-3 py-2 text-xs"><LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Cargando modelo…</div>}
                {status === "error" && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111923] p-6 text-center"><AlertCircle size={25} className="text-amber-300" aria-hidden="true" /><p className="text-sm text-white">No pudimos mostrar este modelo.</p><p className="max-w-xs text-xs leading-relaxed text-slate-400">Comprueba la URL, el permiso CORS del alojamiento y que tu navegador tenga WebGL. Los GLB con texturas incluidas ofrecen mayor compatibilidad.</p><button type="button" className="flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-xs" onClick={() => { setReady(false); setAttempt(attempt + 1); }}><RotateCcw size={14} aria-hidden="true" />Reintentar</button></div>}
            </div>
            <p role="status" className="border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed text-slate-400">{status === "loaded" ? "Arrastra para girar · pellizca o usa la rueda para acercar. También puedes usar las flechas del teclado." : "El modelo se descarga desde su alojamiento al activar esta vista. No se almacena en nuestro servidor."}</p>
        </div>
    );
}
