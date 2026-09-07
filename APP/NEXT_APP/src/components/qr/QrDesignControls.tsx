import { useEffect, useState } from "react";
import type { EyeStyle, QRStyle } from "@/utils/qr-renderer";

const names: Record<string, string> = { square: "Cuadrado", rounded: "Redondeado", dots: "Puntos", classy: "Esquinas", diamond: "Diamante", circle: "Círculo", leaf: "Hoja" };

function Shape({ shape, eye }: { shape: QRStyle | EyeStyle; eye: boolean }) {
    const path = shape === "diamond" ? "M12 2 22 12 12 22 2 12Z" : shape === "leaf" ? "M3 3H12A9 9 0 0 1 21 12V21H12A9 9 0 0 1 3 12Z" : shape === "classy" ? "M3 3H21V21H12A9 9 0 0 1 3 12Z" : null;
    return <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill={eye ? "none" : "currentColor"} stroke={eye ? "currentColor" : "none"} strokeWidth="2.5">
        {path ? <path d={path} /> : shape === "circle" || shape === "dots" ? <circle cx="12" cy="12" r="9" /> : <rect x="3" y="3" width="18" height="18" rx={shape === "rounded" ? 5 : 0} />}
        {eye && <rect x="9" y="9" width="6" height="6" rx={shape === "square" ? 0 : 2} fill="currentColor" stroke="none" />}
    </svg>;
}

export function QrShapePicker<T extends QRStyle | EyeStyle>({ label, value, options, onChange, eye = false }: { label: string; value: T; options: T[]; onChange: (value: T) => void; eye?: boolean }) {
    return <fieldset className="min-w-0"><legend className="mb-2 text-xs text-slate-300">{label}</legend><div className="grid grid-cols-5 gap-1.5">
        {options.map(shape => <button key={shape} type="button" aria-label={names[shape]} title={names[shape]} aria-pressed={value === shape} onClick={() => onChange(shape)} className="qr-shape-button"><Shape shape={shape} eye={eye} /><span className="text-[10px]">{names[shape]}</span></button>)}
    </div></fieldset>;
}

export function QrColorField({ label, color, onChange }: { label: string; color: string; onChange: (value: string) => void }) {
    const [draft, setDraft] = useState(color);
    useEffect(() => setDraft(color), [color]);
    return <div className="min-w-0"><p className="mb-2 text-xs text-slate-300">{label}</p><div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#0b111a] px-2">
        <input type="color" aria-label={label} value={color} onChange={event => onChange(event.target.value)} className="h-8 w-8 shrink-0 cursor-pointer border-0 bg-transparent p-0" />
        <input aria-label={`${label} hexadecimal`} value={draft} maxLength={7} spellCheck={false} onChange={event => { setDraft(event.target.value); if (/^#[\da-f]{6}$/i.test(event.target.value)) onChange(event.target.value); }} onBlur={() => setDraft(color)} className="min-w-0 w-full bg-transparent font-mono text-xs uppercase text-slate-200 outline-none" />
    </div></div>;
}
