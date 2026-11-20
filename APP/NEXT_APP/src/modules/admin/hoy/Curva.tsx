import type { Dia } from "./datos";

const corta = (f: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${f}T12:00:00Z`));

/** Visitas por día en 30 días: una línea con su área, sin ejes de más. El resumen va en texto para lectores de pantalla. */
export function Curva({ dias }: { dias: Dia[] }) {
    const max = Math.max(1, ...dias.map((d) => d.visitas)), total = dias.reduce((s, d) => s + d.visitas, 0);
    const pico = dias.reduce((a, d) => (d.visitas > a.visitas ? d : a), dias[0]!);
    const W = 300, H = 110, paso = W / Math.max(1, dias.length - 1);
    const puntos = dias.map((d, i) => `${(i * paso).toFixed(1)} ${(H - 6 - (d.visitas / max) * (H - 16)).toFixed(1)}`);
    const linea = `M${puntos.join(" L")}`;
    return (
        <section className="hoy-curva" aria-labelledby="hoy-curva">
            <h2 id="hoy-curva">Visitas, 30 días</h2>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${total} visitas en 30 días; el día con más fue el ${corta(pico.fecha)}, con ${pico.visitas}.`}>
                <defs><linearGradient id="hoy-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--acento)" stopOpacity=".26" /><stop offset="1" stopColor="var(--acento)" stopOpacity="0" /></linearGradient></defs>
                <path d={`${linea} L${W} ${H} L0 ${H}Z`} fill="url(#hoy-area)" />
                <path d={linea} fill="none" stroke="var(--acento)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </svg>
            <p className="hoy-ejes" aria-hidden="true"><span>{corta(dias[0]!.fecha)}</span><span>máx. {pico.visitas}</span><span>hoy</span></p>
        </section>
    );
}
